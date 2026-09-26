extends Node2D

signal died

@export var speed := 265.0
@export var turn_smoothing := 12.0

var world_radius := 1100.0
var direction := Vector2.RIGHT
var target_direction := Vector2.RIGHT
var player_color := Color("#ffd84d")
var alive := true

func _ready() -> void:
	queue_redraw()

func _physics_process(delta: float) -> void:
	if not alive:
		return

	var input_dir := Input.get_vector("move_left", "move_right", "move_up", "move_down")

	if input_dir.length() > 0.1:
		target_direction = input_dir.normalized()

	direction = direction.lerp(target_direction, min(1.0, turn_smoothing * delta)).normalized()
	position += direction * speed * delta

	if position.length() > world_radius - 18.0:
		position = position.normalized() * (world_radius - 18.0)
		target_direction = (-position).normalized()
		direction = target_direction

	queue_redraw()

func kill() -> void:
	if not alive:
		return
	alive = false
	died.emit()

func reset_to(new_position: Vector2) -> void:
	position = new_position
	direction = Vector2.RIGHT
	target_direction = Vector2.RIGHT
	alive = true
	queue_redraw()

func _draw() -> void:
	var body := Rect2(Vector2(-15, -15), Vector2(30, 30))
	draw_rect(body, player_color)

	var eye_offset := direction.normalized() * 7.0
	draw_circle(eye_offset + Vector2(-3, -3), 2.8, Color.WHITE)
	draw_circle(eye_offset + Vector2(3, 3), 2.8, Color.WHITE)
