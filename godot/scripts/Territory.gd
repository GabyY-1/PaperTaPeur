extends Node2D

const CELL_SIZE := 14
const START_RADIUS := 120.0

var world_radius := 1100.0
var grid_size := 0
var half_grid := 0
var owned: Dictionary = {}
var player_color := Color("#ffd84d")

func setup(radius: float, start_position: Vector2) -> void:
	world_radius = radius
	grid_size = int(ceil((world_radius * 2.0) / CELL_SIZE)) + 4
	half_grid = grid_size / 2
	owned.clear()

	for y in range(-half_grid, half_grid + 1):
		for x in range(-half_grid, half_grid + 1):
			var world := cell_to_world(Vector2i(x, y))
			if world.length() <= START_RADIUS:
				owned[Vector2i(x, y)] = true

	queue_redraw()

func world_to_cell(world: Vector2) -> Vector2i:
	return Vector2i(
		int(floor(world.x / CELL_SIZE)),
		int(floor(world.y / CELL_SIZE))
	)

func cell_to_world(cell: Vector2i) -> Vector2:
	return Vector2(
		cell.x * CELL_SIZE + CELL_SIZE * 0.5,
		cell.y * CELL_SIZE + CELL_SIZE * 0.5
	)

func is_owned_world(world: Vector2) -> bool:
	return owned.has(world_to_cell(world))

func capture_from_trail(points: PackedVector2Array) -> void:
	if points.size() < 3:
		return

	var blocked: Dictionary = {}
	for i in range(points.size() - 1):
		_rasterize_segment(points[i], points[i + 1], blocked)

	for cell in blocked.keys():
		owned[cell] = true

	var outside_cells := _flood_fill_outside(blocked)

	for y in range(-half_grid, half_grid + 1):
		for x in range(-half_grid, half_grid + 1):
			var cell := Vector2i(x, y)
			var world := cell_to_world(cell)

			if world.length() > world_radius:
				continue

			if owned.has(cell):
				continue

			if not outside_cells.has(cell):
				owned[cell] = true

	queue_redraw()

func _rasterize_segment(a: Vector2, b: Vector2, blocked: Dictionary) -> void:
	var distance := a.distance_to(b)
	var steps := max(1, int(ceil(distance / (CELL_SIZE * 0.35))))

	for i in range(steps + 1):
		var t := float(i) / float(steps)
		var p := a.lerp(b, t)
		var center := world_to_cell(p)

		for oy in range(-1, 2):
			for ox in range(-1, 2):
				var c := center + Vector2i(ox, oy)
				if cell_to_world(c).length() <= world_radius:
					blocked[c] = true

func _flood_fill_outside(blocked: Dictionary) -> Dictionary:
	var visited: Dictionary = {}
	var queue: Array[Vector2i] = []

	for y in range(-half_grid, half_grid + 1):
		for x in range(-half_grid, half_grid + 1):
			var cell := Vector2i(x, y)
			var world := cell_to_world(cell)
			if world.length() <= world_radius and world.length() >= world_radius - CELL_SIZE * 2.2:
				_try_enqueue(cell, blocked, visited, queue)

	var index := 0
	var dirs := [
		Vector2i(1, 0),
		Vector2i(-1, 0),
		Vector2i(0, 1),
		Vector2i(0, -1)
	]

	while index < queue.size():
		var current := queue[index]
		index += 1

		for dir in dirs:
			_try_enqueue(current + dir, blocked, visited, queue)

	return visited

func _try_enqueue(cell: Vector2i, blocked: Dictionary, visited: Dictionary, queue: Array[Vector2i]) -> void:
	if cell.x < -half_grid or cell.x > half_grid:
		return
	if cell.y < -half_grid or cell.y > half_grid:
		return
	if visited.has(cell):
		return
	if blocked.has(cell):
		return
	if owned.has(cell):
		return

	var world := cell_to_world(cell)
	if world.length() > world_radius:
		return

	visited[cell] = true
	queue.append(cell)

func get_owned_percent() -> float:
	var owned_count := 0
	var playable_count := 0

	for y in range(-half_grid, half_grid + 1):
		for x in range(-half_grid, half_grid + 1):
			var cell := Vector2i(x, y)
			if cell_to_world(cell).length() <= world_radius:
				playable_count += 1
				if owned.has(cell):
					owned_count += 1

	if playable_count == 0:
		return 0.0

	return float(owned_count) / float(playable_count) * 100.0

func _draw() -> void:
	for cell in owned.keys():
		var center := cell_to_world(cell)
		var rect := Rect2(
			center - Vector2(CELL_SIZE, CELL_SIZE) * 0.5,
			Vector2(CELL_SIZE + 1, CELL_SIZE + 1)
		)
		draw_rect(rect, player_color)
