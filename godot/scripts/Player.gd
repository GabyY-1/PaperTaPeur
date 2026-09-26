extends "res://scripts/Agent.gd"

func _update_target_direction(_delta):
	var input_dir = Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if input_dir.length() > 0.1:
		target_direction = input_dir.normalized()
