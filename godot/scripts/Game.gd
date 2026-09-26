extends Node2D

signal game_over(score, kills, percent, coins)

const TerritoryScript = preload("res://scripts/Territory.gd")
const PlayerScript = preload("res://scripts/Player.gd")
const BotScript = preload("res://scripts/Bot.gd")

const WORLD_RADIUS := 1100.0
const BOT_COUNT := 6
const COIN_COUNT := 45

var player_name := "Player"
var player_color := Color("#ffd84d")

var territory: Node2D
var player: Node2D
var bots: Array[Node2D] = []
var coins: Array[Vector2] = []

var hud: CanvasLayer
var territory_label: Label
var stats_label: Label
var leaderboard_label: Label
var pause_label: Label

var score := 0
var kills := 0
var coins_collected := 0
var max_percent := 0.0
var game_time := 0.0
var ended := false

var bot_colors := [
	Color("#55a7ff"),
	Color("#ff637b"),
	Color("#67dc9a"),
	Color("#b878ff"),
	Color("#ff914d"),
	Color("#43d7d0"),
	Color("#f062c0")
]

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_PAUSABLE
	_build_world()
	_build_hud()
	_spawn_player()
	_spawn_bots()
	_spawn_coins()
	queue_redraw()

func _build_world() -> void:
	territory = TerritoryScript.new()
	add_child(territory)
	territory.setup(WORLD_RADIUS)

func _spawn_player() -> void:
	player = PlayerScript.new()
	player.owner_id = 0
	player.world_radius = WORLD_RADIUS
	add_child(player)
	player.setup(territory, 0, player_color, Vector2.ZERO, player_name)
	player.captured.connect(_on_agent_captured)
	player.eliminated.connect(_on_agent_eliminated)

	var camera := Camera2D.new()
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 7.0
	player.add_child(camera)

func _spawn_bots() -> void:
	for i in range(BOT_COUNT):
		var bot := BotScript.new()
		var owner_id := i + 1
		var angle := TAU * float(i) / float(BOT_COUNT)
		var start := Vector2.from_angle(angle) * randf_range(440.0, 760.0)
		add_child(bot)
		bot.setup(territory, owner_id, bot_colors[i % bot_colors.size()], start, "Bot %d" % (i + 1))
		bot.configure_personality()
		bot.captured.connect(_on_agent_captured)
		bot.eliminated.connect(_on_agent_eliminated)
		bots.append(bot)

func _spawn_coins() -> void:
	coins.clear()
	for i in range(COIN_COUNT):
		coins.append(_random_map_point(130.0))

func _process(delta: float) -> void:
	if ended:
		return

	game_time += delta
	_check_trail_collisions()
	_collect_coins()
	_update_stats()
	_update_hud()
	queue_redraw()

func _check_trail_collisions() -> void:
	var agents: Array[Node2D] = [player]
	for bot in bots:
		agents.append(bot)

	for attacker in agents:
		if not is_instance_valid(attacker) or not attacker.alive:
			continue

		for victim in agents:
			if attacker == victim or not is_instance_valid(victim) or not victim.alive:
				continue

			if victim.hits_trail(attacker.position):
				victim.die(attacker.owner_id)

func _collect_coins() -> void:
	if not player.alive:
		return

	for i in range(coins.size() - 1, -1, -1):
		if player.position.distance_to(coins[i]) <= 27.0:
			coins.remove_at(i)
			coins_collected += 1
			score += 35
			coins.append(_random_map_point(130.0))

func _update_stats() -> void:
	var percent := territory.get_percent(0)
	max_percent = max(max_percent, percent)
	score = max(score, int(game_time * 3.0 + max_percent * 160.0 + kills * 500.0 + coins_collected * 35.0))

func _on_agent_captured(agent: Node2D, gained: int) -> void:
	if agent.owner_id == 0:
		score += gained * 2

func _on_agent_eliminated(agent: Node2D, killer_id: int) -> void:
	if agent.owner_id == 0:
		if ended:
			return
		ended = true
		game_over.emit(score, kills, max_percent, coins_collected)
		return

	if killer_id == 0:
		kills += 1
		score += 500

	var timer := get_tree().create_timer(randf_range(1.2, 2.4))
	timer.timeout.connect(func():
		if is_instance_valid(agent) and not ended:
			agent.respawn(_find_spawn_point())
	)

func _find_spawn_point() -> Vector2:
	for attempt in range(20):
		var p := _random_map_point(220.0)
		if territory.get_owner_world(p) == -1:
			return p
	return _random_map_point(220.0)

func _random_map_point(margin: float) -> Vector2:
	var a := randf() * TAU
	var r := sqrt(randf()) * (WORLD_RADIUS - margin)
	return Vector2.from_angle(a) * r

func _build_hud() -> void:
	hud = CanvasLayer.new()
	add_child(hud)

	territory_label = Label.new()
	territory_label.position = Vector2(20, 16)
	territory_label.add_theme_font_size_override("font_size", 24)
	hud.add_child(territory_label)

	stats_label = Label.new()
	stats_label.position = Vector2(20, 49)
	stats_label.add_theme_font_size_override("font_size", 17)
	stats_label.modulate = Color(1, 1, 1, 0.78)
	hud.add_child(stats_label)

	leaderboard_label = Label.new()
	leaderboard_label.position = Vector2(1020, 18)
	leaderboard_label.custom_minimum_size = Vector2(235, 210)
	leaderboard_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	leaderboard_label.add_theme_font_size_override("font_size", 17)
	hud.add_child(leaderboard_label)

	pause_label = Label.new()
	pause_label.text = "Échap : pause"
	pause_label.position = Vector2(20, 684)
	pause_label.modulate = Color(1, 1, 1, 0.55)
	hud.add_child(pause_label)

func _update_hud() -> void:
	var percent := territory.get_percent(0)
	territory_label.text = "Territoire : %.1f%%" % percent
	stats_label.text = "Score %d   •   Kills %d   •   Pièces %d" % [score, kills, coins_collected]

	var ranking: Array[Dictionary] = []
	ranking.append({"name": player_name, "percent": percent})

	for bot in bots:
		if is_instance_valid(bot):
			ranking.append({"name": bot.display_name, "percent": territory.get_percent(bot.owner_id)})

	ranking.sort_custom(func(a, b): return float(a["percent"]) > float(b["percent"]))

	var text := "CLASSEMENT\n"
	for i in range(min(5, ranking.size())):
		text += "%d. %s — %.1f%%\n" % [i + 1, ranking[i]["name"], ranking[i]["percent"]]
	leaderboard_label.text = text

func _draw() -> void:
	draw_circle(Vector2.ZERO, WORLD_RADIUS + 18.0, Color("#111820"))
	draw_circle(Vector2.ZERO, WORLD_RADIUS, Color("#e7ecef"))

	var grid_color := Color(0.2, 0.25, 0.3, 0.06)
	var step := 110
	for x in range(-1000, 1001, step):
		draw_line(Vector2(x, -1000), Vector2(x, 1000), grid_color, 1.0)
	for y in range(-1000, 1001, step):
		draw_line(Vector2(-1000, y), Vector2(1000, y), grid_color, 1.0)

	for coin in coins:
		draw_circle(coin, 8.0, Color("#ffbd16"))
		draw_arc(coin, 8.0, 0.0, TAU, 16, Color("#fff2a8"), 2.0, true)

	draw_arc(Vector2.ZERO, WORLD_RADIUS, 0.0, TAU, 180, Color("#aeb9c0"), 6.0, true)
