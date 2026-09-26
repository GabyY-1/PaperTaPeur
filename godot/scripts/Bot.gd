extends "res://scripts/Agent.gd"

var decision_timer = 0.0
var risk = 0.5
var aggression = 0.5

func configure_personality():
	risk = randf_range(0.25, 0.9)
	aggression = randf_range(0.15, 0.85)
	speed = randf_range(205.0, 250.0)
	decision_timer = randf_range(0.2, 0.8)

func _update_target_direction(delta):
	decision_timer -= delta
	if decision_timer > 0.0:
		return

	decision_timer = randf_range(0.28, 0.8)

	if outside:
		var max_trail = lerp(130.0, 420.0, risk)
		var trail_length = _trail_length()
		if trail_length > max_trail:
			var best = _nearest_owned_direction()
			if best.length() > 0.1:
				target_direction = best
				return

	if position.length() > world_radius * 0.8:
		target_direction = (-position).normalized().rotated(randf_range(-0.35, 0.35))
		return

	target_direction = direction.rotated(randf_range(-0.75, 0.75)).normalized()

func _trail_length():
	if trail.size() < 2:
		return 0.0
	var total = 0.0
	for i in range(trail.size() - 1):
		total += trail[i].distance_to(trail[i + 1])
	return total

func _nearest_owned_direction():
	var best_distance = INF
	var best_point = position

	for cell in territory_map.owner_by_cell.keys():
		if int(territory_map.owner_by_cell[cell]) != owner_id:
			continue
		var p = territory_map.cell_to_world(cell)
		var d = position.distance_squared_to(p)
		if d < best_distance:
			best_distance = d
			best_point = p

	return (best_point - position).normalized()
