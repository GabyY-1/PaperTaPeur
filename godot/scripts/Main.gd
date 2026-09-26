extends Node

const GameScript = preload("res://scripts/Game.gd")

var menu_layer: CanvasLayer
var game_over_layer: CanvasLayer
var current_game: Node2D
var name_edit: LineEdit
var color_option: OptionButton

var colors := [
	Color("#ffd84d"),
	Color("#55a7ff"),
	Color("#ff637b"),
	Color("#67dc9a"),
	Color("#b878ff"),
	Color("#ff914d")
]

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_build_menu()

func _build_menu() -> void:
	menu_layer = CanvasLayer.new()
	add_child(menu_layer)

	var bg := ColorRect.new()
	bg.color = Color("#161b22")
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	menu_layer.add_child(bg)

	var panel := VBoxContainer.new()
	panel.custom_minimum_size = Vector2(430, 0)
	panel.position = Vector2(425, 125)
	panel.add_theme_constant_override("separation", 18)
	menu_layer.add_child(panel)

	var title := Label.new()
	title.text = "PaperTaPeur"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 54)
	panel.add_child(title)

	var subtitle := Label.new()
	subtitle.text = "Capture le territoire. Coupe les traces. Reste en vie."
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.modulate = Color(1, 1, 1, 0.72)
	subtitle.add_theme_font_size_override("font_size", 17)
	panel.add_child(subtitle)

	name_edit = LineEdit.new()
	name_edit.placeholder_text = "Ton pseudo"
	name_edit.text = "Player"
	name_edit.max_length = 16
	name_edit.custom_minimum_size.y = 48
	panel.add_child(name_edit)

	color_option = OptionButton.new()
	color_option.custom_minimum_size.y = 44
	color_option.add_item("Jaune")
	color_option.add_item("Bleu")
	color_option.add_item("Rouge")
	color_option.add_item("Vert")
	color_option.add_item("Violet")
	color_option.add_item("Orange")
	panel.add_child(color_option)

	var play := Button.new()
	play.text = "JOUER"
	play.custom_minimum_size.y = 62
	play.add_theme_font_size_override("font_size", 25)
	play.pressed.connect(_start_game)
	panel.add_child(play)

	var controls := Label.new()
	controls.text = "ZQSD / WASD / flèches pour diriger\nÉchap pour mettre en pause"
	controls.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	controls.modulate = Color(1, 1, 1, 0.62)
	panel.add_child(controls)

func _start_game() -> void:
	if is_instance_valid(current_game):
		current_game.queue_free()

	if is_instance_valid(game_over_layer):
		game_over_layer.queue_free()

	menu_layer.visible = false
	get_tree().paused = false

	current_game = GameScript.new()
	current_game.player_name = name_edit.text.strip_edges() if not name_edit.text.strip_edges().is_empty() else "Player"
	current_game.player_color = colors[color_option.selected]
	current_game.game_over.connect(_show_game_over)
	add_child(current_game)

func _show_game_over(score: int, kills: int, percent: float, coins: int) -> void:
	get_tree().paused = true

	game_over_layer = CanvasLayer.new()
	game_over_layer.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(game_over_layer)

	var shade := ColorRect.new()
	shade.color = Color(0.04, 0.05, 0.07, 0.88)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	game_over_layer.add_child(shade)

	var box := VBoxContainer.new()
	box.custom_minimum_size = Vector2(420, 0)
	box.position = Vector2(430, 145)
	box.add_theme_constant_override("separation", 15)
	game_over_layer.add_child(box)

	var title := Label.new()
	title.text = "PARTIE TERMINÉE"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 38)
	box.add_child(title)

	var stats := Label.new()
	stats.text = "Score : %d\nTerritoire max : %.1f%%\nÉliminations : %d\nPièces : %d" % [score, percent, kills, coins]
	stats.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stats.add_theme_font_size_override("font_size", 21)
	box.add_child(stats)

	var replay := Button.new()
	replay.text = "REJOUER"
	replay.custom_minimum_size.y = 55
	replay.pressed.connect(_start_game)
	box.add_child(replay)

	var menu := Button.new()
	menu.text = "MENU"
	menu.custom_minimum_size.y = 48
	menu.pressed.connect(_back_to_menu)
	box.add_child(menu)

func _back_to_menu() -> void:
	get_tree().paused = false
	if is_instance_valid(current_game):
		current_game.queue_free()
	if is_instance_valid(game_over_layer):
		game_over_layer.queue_free()
	menu_layer.visible = true

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause") and is_instance_valid(current_game) and menu_layer != null and not menu_layer.visible:
		if is_instance_valid(game_over_layer):
			return
		get_tree().paused = not get_tree().paused
