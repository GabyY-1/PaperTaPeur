extends Node2D

const CELL_SIZE := 22
const START_RADIUS := 105.0

var world_radius := 1100.0
var half_grid := 0
var owner_by_cell: Dictionary = {}
var colors: Dictionary = {}

func setup(radius: float) -> void:
	world_radius = radius
	half_grid = int(ceil(world_radius / CELL_SIZE)) + 2
	owner_by_cell.clear()
	colors.clear()
	queue_redraw()

func register_owner(owner_id: int, color: Color) -> void:
	colors[owner_id] = color

func create_start_area(owner_id: int, center: Vector2) -> void:
	var min_cell := world_to_cell(center - Vector2(START_RADIUS, START_RADIUS))
	var max_cell := world_to_cell(center + Vector2(START_RADIUS, START_RADIUS))

	for y in range(min_cell.y, max_cell.y + 1):
		for x in range(min_cell.x, max_cell.x + 1):
			var cell := Vector2i(x, y)
			var p := cell_to_world(cell)
			if p.distance_to(center) <= START_RADIUS and p.length() <= world_radius:
				owner_by_cell[cell] = owner_id

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

func get_owner_world(world: Vector2) -> int:
	return int(owner_by_cell.get(world_to_cell(world), -1))

func capture(owner_id: int, trail: PackedVector2Array) -> int:
	if trail.size() < 3:
		return 0

	var barriers: Dictionary = {}

	for cell in owner_by_cell.keys():
		if int(owner_by_cell[cell]) == owner_id:
			barriers[cell] = true

	for i in range(trail.size() - 1):
		_rasterize_segment(trail[i], trail[i + 1], barriers)

	for cell in barriers.keys():
		if cell_to_world(cell).length() <= world_radius:
			owner_by_cell[cell] = owner_id

	var outside := _flood_from_border(barriers)
	var gained := 0

	for y in range(-half_grid, half_grid + 1):
		for x in range(-half_grid, half_grid + 1):
			var cell := Vector2i(x, y)
			var p := cell_to_world(cell)

			if p.length() > world_radius:
				continue

			if barriers.has(cell):
				continue

			if not outside.has(cell):
				if int(owner_by_cell.get(cell, -1)) != owner_id:
					gained += 1
				owner_by_cell[cell] = owner_id

	queue_redraw()
	return gained

func _rasterize_segment(a: Vector2, b: Vector2, barriers: Dictionary) -> void:
	var distance := a.distance_to(b)
	var steps := max(1, int(ceil(distance / (CELL_SIZE * 0.3))))

	for i in range(steps + 1):
		var t := float(i) / float(steps)
		var p := a.lerp(b, t)
		var center := world_to_cell(p)

		for oy in range(-1, 2):
			for ox in range(-1, 2):
				var cell := center + Vector2i(ox, oy)
				if cell_to_world(cell).length() <= world_radius:
					barriers[cell] = true

func _flood_from_border(barriers: Dictionary) -> Dictionary:
	var visited: Dictionary = {}
	var queue: Array[Vector2i] = []

	for y in range(-half_grid, half_grid + 1):
		for x in range(-half_grid, half_grid + 1):
			var cell := Vector2i(x, y)
			var p := cell_to_world(cell)
			if p.length() <= world_radius and p.length() >= world_radius - CELL_SIZE * 2.2:
				_try_enqueue(cell, barriers, visited, queue)

	var dirs := [
		Vector2i(1, 0),
		Vector2i(-1, 0),
		Vector2i(0, 1),
		Vector2i(0, -1)
	]

	var index := 0
	while index < queue.size():
		var current := queue[index]
		index += 1
		for dir in dirs:
			_try_enqueue(current + dir, barriers, visited, queue)

	return visited

func _try_enqueue(cell: Vector2i, barriers: Dictionary, visited: Dictionary, queue: Array[Vector2i]) -> void:
	if cell.x < -half_grid or cell.x > half_grid:
		return
	if cell.y < -half_grid or cell.y > half_grid:
		return
	if visited.has(cell) or barriers.has(cell):
		return
	if cell_to_world(cell).length() > world_radius:
		return

	visited[cell] = true
	queue.append(cell)

func clear_owner(owner_id: int) -> void:
	var remove: Array[Vector2i] = []
	for cell in owner_by_cell.keys():
		if int(owner_by_cell[cell]) == owner_id:
			remove.append(cell)

	for cell in remove:
		owner_by_cell.erase(cell)

	queue_redraw()

func get_percent(owner_id: int) -> float:
	var total := 0
	var owned := 0

	for y in range(-half_grid, half_grid + 1):
		for x in range(-half_grid, half_grid + 1):
			var cell := Vector2i(x, y)
			if cell_to_world(cell).length() <= world_radius:
				total += 1
				if int(owner_by_cell.get(cell, -1)) == owner_id:
					owned += 1

	if total == 0:
		return 0.0
	return float(owned) / float(total) * 100.0

func _draw() -> void:
	for cell in owner_by_cell.keys():
		var owner_id := int(owner_by_cell[cell])
		var color: Color = colors.get(owner_id, Color.GRAY)
		var center := cell_to_world(cell)
		draw_rect(
			Rect2(center - Vector2(CELL_SIZE, CELL_SIZE) * 0.5, Vector2(CELL_SIZE + 1, CELL_SIZE + 1)),
			color.darkened(0.08)
		)
