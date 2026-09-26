extends Node2D

const WORLD_RADIUS := 1100.0
const PLAYER_SPEED := 260.0
const BOT_COUNT := 5

var player_pos := Vector2.ZERO
var player_dir := Vector2.RIGHT
var player_color := Color("#ffd84d")

var home_polygon := PackedVector2Array()
var trail := PackedVector2Array()
var outside := false

var bots: Array[Dictionary] = []
var coins: Array[Vector2] = []

var territory_percent := 0.0
var score_label: Label
var info_label: Label
var camera: Camera2D

func _ready() -> void:
	_build_ui()
	_build_starting_territory()
	_spawn_bots()
	_spawn_coins()
	queue_redraw()

func _process(delta: float) -> void:
	_update_player(delta)
	_update_bots(delta)
	_collect_coins()
	_update_camera()
	queue_redraw()

func _build_ui() -> void:
	camera = Camera2D.new()
	add_child(camera)
	camera.position = player_pos

	var canvas := CanvasLayer.new()
	add_child(canvas)

	score_label = Label.new()
	score_label.position = Vector2(18, 16)
	score_label.add_theme_font_size_override("font_size", 22)
	canvas.add_child(score_label)

	info_label = Label.new()
	info_label.position = Vector2(18, 48)
	info_label.text = "ZQSD / WASD / Flèches"
	info_label.modulate = Color(1,1,1,0.7)
	canvas.add_child(info_label)

func _build_starting_territory() -> void:
	home_polygon.clear()
	var segments := 48
	var radius := 135.0
	for i in range(segments):
		var a := TAU * float(i) / float(segments)
		home_polygon.append(Vector2(cos(a), sin(a)) * radius)
	_update_score()

func _spawn_bots() -> void:
	var colors := [
		Color("#55a7ff"),
		Color("#ff637b"),
		Color("#67dc9a"),
		Color("#b878ff"),
		Color("#ff914d")
	]

	for i in range(BOT_COUNT):
		var angle := TAU * float(i) / float(BOT_COUNT)
		var pos := Vector2(cos(angle), sin(angle)) * (480.0 + i * 70.0)
		bots.append({
			"pos": pos,
			"dir": Vector2.from_angle(angle + PI * 0.5),
			"color": colors[i % colors.size()],
			"speed": 150.0 + i * 7.0
		})

func _spawn_coins() -> void:
	coins.clear()
	for i in range(65):
		var a := randf() * TAU
		var r := sqrt(randf()) * (WORLD_RADIUS - 80.0)
		coins.append(Vector2(cos(a), sin(a)) * r)

func _update_player(delta: float) -> void:
	var input_dir := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if input_dir.length() > 0.1:
		player_dir = input_dir.normalized()

	player_pos += player_dir * PLAYER_SPEED * delta

	if player_pos.length() > WORLD_RADIUS - 18.0:
		player_pos = player_pos.normalized() * (WORLD_RADIUS - 18.0)

	var now_inside := Geometry2D.is_point_in_polygon(player_pos, home_polygon)

	if not now_inside:
		if not outside:
			outside = true
			trail.clear()

		if trail.is_empty() or trail[-1].distance_to(player_pos) > 12.0:
			trail.append(player_pos)

			if _hits_own_trail():
				_reset_player()
				return

	elif outside:
		if trail.size() >= 3:
			_close_loop()
		outside = false
		trail.clear()

	score_label.text = "Territoire : %.1f%%" % territory_percent

func _hits_own_trail() -> bool:
	if trail.size() < 10:
		return false

	for i in range(trail.size() - 6):
		if player_pos.distance_to(trail[i]) < 16.0:
			return true

	return false

func _close_loop() -> void:
	var loop := PackedVector2Array()
	for p in trail:
		loop.append(p)

	# On ajoute les points de la boucle au territoire actuel.
	# Geometry2D.merge_polygons permet une vraie forme irrégulière.
	var merged := Geometry2D.merge_polygons(home_polygon, loop)

	if merged.size() > 0:
		var biggest := merged[0]
		var biggest_area := abs(_polygon_area(biggest))

		for poly in merged:
			var area := abs(_polygon_area(poly))
			if area > biggest_area:
				biggest = poly
				biggest_area = area

		home_polygon = biggest
		_update_score()

func _polygon_area(poly: PackedVector2Array) -> float:
	if poly.size() < 3:
		return 0.0

	var total := 0.0
	for i in range(poly.size()):
		var a := poly[i]
		var b := poly[(i + 1) % poly.size()]
		total += a.x * b.y - b.x * a.y

	return total * 0.5

func _update_score() -> void:
	var map_area := PI * WORLD_RADIUS * WORLD_RADIUS
	var own_area := abs(_polygon_area(home_polygon))
	territory_percent = clamp((own_area / map_area) * 100.0, 0.0, 100.0)

func _update_bots(delta: float) -> void:
	for i in range(bots.size()):
		var b = bots[i]
		var pos: Vector2 = b["pos"]
		var dir: Vector2 = b["dir"]
		var speed: float = b["speed"]

		if randf() < 0.018:
			dir = dir.rotated(randf_range(-0.7, 0.7))

		pos += dir.normalized() * speed * delta

		if pos.length() > WORLD_RADIUS - 35.0:
			dir = (-pos).normalized().rotated(randf_range(-0.4, 0.4))
			pos = pos.normalized() * (WORLD_RADIUS - 35.0)

		b["pos"] = pos
		b["dir"] = dir
		bots[i] = b

func _collect_coins() -> void:
	for i in range(coins.size() - 1, -1, -1):
		if player_pos.distance_to(coins[i]) < 24.0:
			coins.remove_at(i)

	if coins.size() < 65:
		var a := randf() * TAU
		var r := sqrt(randf()) * (WORLD_RADIUS - 80.0)
		coins.append(Vector2(cos(a), sin(a)) * r)

func _update_camera() -> void:
	camera.position = camera.position.lerp(player_pos, 0.12)

func _reset_player() -> void:
	player_pos = Vector2.ZERO
	player_dir = Vector2.RIGHT
	outside = false
	trail.clear()

func _draw() -> void:
	# Extérieur de la map
	draw_circle(Vector2.ZERO, WORLD_RADIUS + 10.0, Color("#111827"))
	draw_circle(Vector2.ZERO, WORLD_RADIUS, Color("#dce7eb"))

	# Grille légère
	var step := 80.0
	for x in range(int(-WORLD_RADIUS), int(WORLD_RADIUS) + 1, int(step)):
		draw_line(Vector2(x, -WORLD_RADIUS), Vector2(x, WORLD_RADIUS), Color(0.32,0.39,0.43,0.12), 1.0)
	for y in range(int(-WORLD_RADIUS), int(WORLD_RADIUS) + 1, int(step)):
		draw_line(Vector2(-WORLD_RADIUS, y), Vector2(WORLD_RADIUS, y), Color(0.32,0.39,0.43,0.12), 1.0)

	# Territoire
	if home_polygon.size() >= 3:
		draw_colored_polygon(home_polygon, player_color.darkened(0.12))

	# Pièces
	for c in coins:
		draw_circle(c, 7.0, Color("#ffbc00"))
		draw_arc(c, 7.0, 0.0, TAU, 16, Color("#fff0a8"), 2.0)

	# Bots
	for b in bots:
		var p: Vector2 = b["pos"]
		var col: Color = b["color"]
		draw_rect(Rect2(p - Vector2(13,13), Vector2(26,26)), col)

	# Trace
	if trail.size() >= 2:
		for i in range(trail.size() - 1):
			draw_line(trail[i], trail[i + 1], player_color, 14.0, true)

	# Joueur
	draw_rect(Rect2(player_pos - Vector2(15,15), Vector2(30,30)), player_color)
	draw_circle(player_pos + player_dir * 7.0, 3.5, Color.WHITE)
