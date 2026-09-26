extends Node2D

signal captured(agent, gained)
signal eliminated(agent, killer_id)

var territory_map = null
var owner_id = -1
var display_name = "Agent"
var agent_color = Color.WHITE
var world_radius = 1100.0
var speed = 245.0

var direction = Vector2.RIGHT
var target_direction = Vector2.RIGHT
var trail = PackedVector2Array()
var outside = false
var alive = true

const TRAIL_POINT_DISTANCE = 9.0
const TRAIL_WIDTH = 15.0

func setup(map_node, id, color, start, label_name):
	territory_map = map_node
	owner_id = id
	agent_color = color
	position = start
	display_name = label_name
	territory_map.register_owner(owner_id, agent_color)
	territory_map.create_start_area(owner_id, position)
	queue_redraw()

func _physics_process(delta):
	if not alive or territory_map == null:
		return

	_update_target_direction(delta)

	if target_direction.length() > 0.1:
		direction = direction.lerp(target_direction.normalized(), min(1.0, 10.0 * delta)).normalized()

	position += direction * speed * delta

	if position.length() > world_radius - 22.0:
		position = position.normalized() * (world_radius - 22.0)
		target_direction = (-position).normalized()
		direction = target_direction

	_update_territory_state()
	queue_redraw()

func _update_target_direction(_delta):
	pass

func _update_territory_state():
	var inside = territory_map.get_owner_world(position) == owner_id

	if not inside:
		if not outside:
			outside = true
			trail.clear()
			trail.append(position)

		if trail.is_empty() or trail[trail.size() - 1].distance_to(position) >= TRAIL_POINT_DISTANCE:
			trail.append(position)

		if _hits_own_trail():
			die(owner_id)
	else:
		if outside:
			if trail.size() >= 3:
				var gained = territory_map.capture(owner_id, trail)
				captured.emit(self, gained)
			trail.clear()
			outside = false

func _hits_own_trail():
	if trail.size() < 10:
		return false

	for i in range(trail.size() - 7):
		if position.distance_to(trail[i]) <= TRAIL_WIDTH * 0.72:
			return true
	return false

func hits_trail(point):
	if not alive or trail.size() < 2:
		return false

	for i in range(trail.size() - 1):
		if _distance_to_segment(point, trail[i], trail[i + 1]) <= TRAIL_WIDTH * 0.65:
			return true
	return false

func _distance_to_segment(p, a, b):
	var ab = b - a
	var denom = ab.length_squared()
	if denom <= 0.0001:
		return p.distance_to(a)
	var t = clamp((p - a).dot(ab) / denom, 0.0, 1.0)
	return p.distance_to(a + ab * t)

func die(killer_id):
	if not alive:
		return
	alive = false
	trail.clear()
	territory_map.clear_owner(owner_id)
	eliminated.emit(self, killer_id)
	visible = false

func respawn(start):
	position = start
	direction = Vector2.from_angle(randf() * TAU)
	target_direction = direction
	trail.clear()
	outside = false
	alive = true
	visible = true
	territory_map.create_start_area(owner_id, position)
	queue_redraw()

func _draw():
	if not alive:
		return

	if trail.size() >= 2:
		for i in range(trail.size() - 1):
			draw_line(to_local(trail[i]), to_local(trail[i + 1]), agent_color, TRAIL_WIDTH, true)

	draw_rect(Rect2(Vector2(-15, -15), Vector2(30, 30)), agent_color)
	draw_circle(direction * 7.0 + Vector2(-3, -2), 2.6, Color.WHITE)
	draw_circle(direction * 7.0 + Vector2(3, 2), 2.6, Color.WHITE)
