extends Node2D

@onready var territory = $Territory
@onready var player = $Player
@onready var camera = $Player/Camera2D
@onready var territory_label = $UI/TerritoryLabel
@onready var help_label = $UI/HelpLabel

const WORLD_RADIUS := 1100.0
const TRAIL_WIDTH := 16.0
const TRAIL_POINT_DISTANCE := 8.0

var trail: PackedVector2Array = PackedVector2Array()
var outside := false

func _ready() -> void:
	territory.setup(WORLD_RADIUS, player.position)
	player.world_radius = WORLD_RADIUS
	player.died.connect(_on_player_died)
	_update_ui()
	queue_redraw()

func _process(_delta: float) -> void:
	var inside := territory.is_owned_world(player.position)

	if not inside:
		if not outside:
			outside = true
			trail.clear()
			trail.append(player.position)

		if trail.is_empty() or trail[-1].distance_to(player.position) >= TRAIL_POINT_DISTANCE:
			trail.append(player.position)

		if _hits_own_trail():
			player.kill()
			return
	else:
		if outside:
			if trail.size() >= 3:
				territory.capture_from_trail(trail)
			trail.clear()
			outside = false
			_update_ui()

	queue_redraw()

func _hits_own_trail() -> bool:
	if trail.size() < 10:
		return false

	for i in range(trail.size() - 7):
		if player.position.distance_to(trail[i]) <= TRAIL_WIDTH * 0.72:
			return true

	return false

func _on_player_died() -> void:
	trail.clear()
	outside = false
	player.reset_to(Vector2.ZERO)
	_update_ui()
	queue_redraw()

func _update_ui() -> void:
	territory_label.text = "Territoire : %.1f%%" % territory.get_owned_percent()
	help_label.text = "ZQSD / WASD / Flèches  •  Ferme une boucle pour capturer"

func _draw() -> void:
	draw_circle(Vector2.ZERO, WORLD_RADIUS + 18.0, Color("#17202a"))
	draw_circle(Vector2.ZERO, WORLD_RADIUS, Color("#e9eef1"))

	if trail.size() >= 2:
		for i in range(trail.size() - 1):
			draw_line(trail[i], trail[i + 1], player.player_color, TRAIL_WIDTH, true)

	draw_arc(Vector2.ZERO, WORLD_RADIUS, 0.0, TAU, 180, Color("#c3ccd2"), 5.0, true)
