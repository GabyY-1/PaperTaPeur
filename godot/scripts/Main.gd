extends Node2D

const WORLD_RADIUS = 1100.0
const PLAYER_SPEED = 260.0
const CELL_SIZE = 18
const START_RADIUS = 120.0
const TRAIL_WIDTH = 16.0
const TRAIL_STEP = 8.0

var player_pos = Vector2.ZERO
var direction = Vector2.RIGHT
var target_direction = Vector2.RIGHT
var player_color = Color("#ffd84d")

var territory = {}
var trail = PackedVector2Array()
var outside = false
var playing = false
var dead = false

var camera = null
var menu_layer = null
var hud_layer = null
var territory_label = null
var help_label = null
var play_button = null

var half_grid = 0

func _ready():
	process_mode = Node.PROCESS_MODE_ALWAYS
	half_grid = int(ceil(WORLD_RADIUS / float(CELL_SIZE))) + 2
	_build_menu()
	queue_redraw()

func _build_menu():
	menu_layer = CanvasLayer.new()
	add_child(menu_layer)

	var bg = ColorRect.new()
	bg.color = Color("#171b22")
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	menu_layer.add_child(bg)

	var box = VBoxContainer.new()
	box.position = Vector2(415, 150)
	box.custom_minimum_size = Vector2(450, 0)
	box.add_theme_constant_override("separation", 18)
	menu_layer.add_child(box)

	var title = Label.new()
	title.text = "PaperTaPeur"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 56)
	box.add_child(title)

	var subtitle = Label.new()
	subtitle.text = "Ferme des boucles pour capturer le terrain."
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.modulate = Color(1, 1, 1, 0.72)
	subtitle.add_theme_font_size_override("font_size", 18)
	box.add_child(subtitle)

	play_button = Button.new()
	play_button.text = "JOUER"
	play_button.custom_minimum_size.y = 64
	play_button.add_theme_font_size_override("font_size", 26)
	play_button.pressed.connect(_start_game)
	box.add_child(play_button)

	var controls = Label.new()
	controls.text = "ZQSD / WASD / Flèches\nClic gauche : diriger vers la souris"
	controls.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	controls.modulate = Color(1, 1, 1, 0.65)
	controls.add_theme_font_size_override("font_size", 17)
	box.add_child(controls)

func _start_game():
	menu_layer.visible = false
	playing = true
	dead = false
	player_pos = Vector2.ZERO
	direction = Vector2.RIGHT
	target_direction = Vector2.RIGHT
	trail.clear()
	outside = false
	_build_start_territory()

	if camera == null:
		camera = Camera2D.new()
		camera.position_smoothing_enabled = true
		camera.position_smoothing_speed = 7.0
		add_child(camera)

	camera.position = player_pos
	_build_hud()
	queue_redraw()

func _build_hud():
	if hud_layer != null and is_instance_valid(hud_layer):
		hud_layer.queue_free()

	hud_layer = CanvasLayer.new()
	add_child(hud_layer)

	territory_label = Label.new()
	territory_label.position = Vector2(20, 18)
	territory_label.add_theme_font_size_override("font_size", 24)
	hud_layer.add_child(territory_label)

	help_label = Label.new()
	help_label.position = Vector2(20, 52)
	help_label.text = "Tu avances automatiquement • reviens dans ta zone pour capturer"
	help_label.modulate = Color(1, 1, 1, 0.7)
	help_label.add_theme_font_size_override("font_size", 16)
	hud_layer.add_child(help_label)

func _process(delta):
	if not playing or dead:
		return

	_read_controls()

	if target_direction.length() > 0.1:
		direction = direction.lerp(target_direction.normalized(), min(1.0, 10.0 * delta)).normalized()

	player_pos += direction * PLAYER_SPEED * delta

	if player_pos.length() > WORLD_RADIUS - 18.0:
		player_pos = player_pos.normalized() * (WORLD_RADIUS - 18.0)
		target_direction = (-player_pos).normalized()
		direction = target_direction

	_update_trail_and_capture()

	if camera != null:
		camera.position = camera.position.lerp(player_pos, min(1.0, 8.0 * delta))

	territory_label.text = "Territoire : %.1f%%" % _territory_percent()
	queue_redraw()

func _read_controls():
	var input_dir = Vector2.ZERO

	if Input.is_key_pressed(KEY_LEFT) or Input.is_key_pressed(KEY_Q) or Input.is_key_pressed(KEY_A):
		input_dir.x -= 1.0
	if Input.is_key_pressed(KEY_RIGHT) or Input.is_key_pressed(KEY_D):
		input_dir.x += 1.0
	if Input.is_key_pressed(KEY_UP) or Input.is_key_pressed(KEY_Z) or Input.is_key_pressed(KEY_W):
		input_dir.y -= 1.0
	if Input.is_key_pressed(KEY_DOWN) or Input.is_key_pressed(KEY_S):
		input_dir.y += 1.0

	if input_dir.length() > 0.1:
		target_direction = input_dir.normalized()

	if Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		var mouse_world = get_global_mouse_position()
		var to_mouse = mouse_world - player_pos
		if to_mouse.length() > 8.0:
			target_direction = to_mouse.normalized()

func _build_start_territory():
	territory.clear()
	var min_cell = _world_to_cell(Vector2(-START_RADIUS, -START_RADIUS))
	var max_cell = _world_to_cell(Vector2(START_RADIUS, START_RADIUS))

	for y in range(min_cell.y, max_cell.y + 1):
		for x in range(min_cell.x, max_cell.x + 1):
			var cell = Vector2i(x, y)
			var p = _cell_to_world(cell)
			if p.length() <= START_RADIUS:
				territory[cell] = true

func _update_trail_and_capture():
	var inside = territory.has(_world_to_cell(player_pos))

	if not inside:
		if not outside:
			outside = true
			trail.clear()
			trail.append(player_pos)

		if trail.is_empty() or trail[trail.size() - 1].distance_to(player_pos) >= TRAIL_STEP:
			trail.append(player_pos)

		if _hits_own_trail():
			_die_and_reset()
	else:
		if outside:
			if trail.size() >= 3:
				_capture_loop()
			trail.clear()
			outside = false

func _hits_own_trail():
	if trail.size() < 10:
		return false

	for i in range(trail.size() - 7):
		if player_pos.distance_to(trail[i]) <= TRAIL_WIDTH * 0.65:
			return true
	return false

func _capture_loop():
	var barriers = {}

	for cell in territory.keys():
		barriers[cell] = true

	for i in range(trail.size() - 1):
		_rasterize_segment(trail[i], trail[i + 1], barriers)

	for cell in barriers.keys():
		if _cell_to_world(cell).length() <= WORLD_RADIUS:
			territory[cell] = true

	var outside_cells = _flood_from_border(barriers)

	for y in range(-half_grid, half_grid + 1):
		for x in range(-half_grid, half_grid + 1):
			var cell = Vector2i(x, y)
			var p = _cell_to_world(cell)

			if p.length() > WORLD_RADIUS:
				continue
			if barriers.has(cell):
				continue
			if not outside_cells.has(cell):
				territory[cell] = true

func _rasterize_segment(a, b, barriers):
	var distance = a.distance_to(b)
	var steps = max(1, int(ceil(distance / (CELL_SIZE * 0.3))))

	for i in range(steps + 1):
		var t = float(i) / float(steps)
		var p = a.lerp(b, t)
		var center = _world_to_cell(p)

		for oy in range(-1, 2):
			for ox in range(-1, 2):
				var cell = center + Vector2i(ox, oy)
				if _cell_to_world(cell).length() <= WORLD_RADIUS:
					barriers[cell] = true

func _flood_from_border(barriers):
	var visited = {}
	var queue = []

	for y in range(-half_grid, half_grid + 1):
		for x in range(-half_grid, half_grid + 1):
			var cell = Vector2i(x, y)
			var p = _cell_to_world(cell)
			if p.length() <= WORLD_RADIUS and p.length() >= WORLD_RADIUS - CELL_SIZE * 2.2:
				_try_enqueue(cell, barriers, visited, queue)

	var dirs = [
		Vector2i(1, 0),
		Vector2i(-1, 0),
		Vector2i(0, 1),
		Vector2i(0, -1)
	]

	var index = 0
	while index < queue.size():
		var current = queue[index]
		index += 1
		for dir in dirs:
			_try_enqueue(current + dir, barriers, visited, queue)

	return visited

func _try_enqueue(cell, barriers, visited, queue):
	if cell.x < -half_grid or cell.x > half_grid:
		return
	if cell.y < -half_grid or cell.y > half_grid:
		return
	if visited.has(cell) or barriers.has(cell):
		return
	if _cell_to_world(cell).length() > WORLD_RADIUS:
		return

	visited[cell] = true
	queue.append(cell)

func _die_and_reset():
	dead = true
	await get_tree().create_timer(0.35).timeout
	player_pos = Vector2.ZERO
	direction = Vector2.RIGHT
	target_direction = Vector2.RIGHT
	trail.clear()
	outside = false
	dead = false

func _world_to_cell(world):
	return Vector2i(
		int(floor(world.x / CELL_SIZE)),
		int(floor(world.y / CELL_SIZE))
	)

func _cell_to_world(cell):
	return Vector2(
		cell.x * CELL_SIZE + CELL_SIZE * 0.5,
		cell.y * CELL_SIZE + CELL_SIZE * 0.5
	)

func _territory_percent():
	var total = 0
	var owned = 0

	for y in range(-half_grid, half_grid + 1):
		for x in range(-half_grid, half_grid + 1):
			var cell = Vector2i(x, y)
			if _cell_to_world(cell).length() <= WORLD_RADIUS:
				total += 1
				if territory.has(cell):
					owned += 1

	if total == 0:
		return 0.0
	return float(owned) / float(total) * 100.0

func _draw():
	draw_circle(Vector2.ZERO, WORLD_RADIUS + 18.0, Color("#111820"))
	draw_circle(Vector2.ZERO, WORLD_RADIUS, Color("#e9eef1"))

	var grid_color = Color(0.20, 0.24, 0.28, 0.06)
	for x in range(-1000, 1001, 100):
		draw_line(Vector2(x, -1000), Vector2(x, 1000), grid_color, 1.0)
	for y in range(-1000, 1001, 100):
		draw_line(Vector2(-1000, y), Vector2(1000, y), grid_color, 1.0)

	for cell in territory.keys():
		var center = _cell_to_world(cell)
		draw_rect(
			Rect2(center - Vector2(CELL_SIZE, CELL_SIZE) * 0.5, Vector2(CELL_SIZE + 1, CELL_SIZE + 1)),
			player_color.darkened(0.08)
		)

	if trail.size() >= 2:
		for i in range(trail.size() - 1):
			draw_line(trail[i], trail[i + 1], player_color, TRAIL_WIDTH, true)

	draw_rect(Rect2(player_pos - Vector2(15, 15), Vector2(30, 30)), player_color)
	draw_circle(player_pos + direction * 7.0, 3.0, Color.WHITE)
	draw_arc(Vector2.ZERO, WORLD_RADIUS, 0.0, TAU, 180, Color("#aeb9c0"), 6.0, true)
