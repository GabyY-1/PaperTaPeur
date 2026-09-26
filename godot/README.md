# PaperTaPeur V1 PC

Projet Godot de PaperTaPeur.

## Inclus dans cette V1
- menu principal
- pseudo
- choix de couleur
- déplacement continu
- ZQSD / WASD / flèches
- caméra fluide
- grande carte ronde
- territoire réel
- trace temporaire hors du territoire
- fermeture de boucle
- capture de territoire neutre ou ennemi
- auto-élimination si la trace se recoupe
- bots avec comportements variables
- traces ennemies
- possibilité d'éliminer un bot en coupant sa trace
- possibilité pour les bots d'éliminer le joueur
- disparition du territoire à la mort
- respawn des bots
- classement en temps réel
- pourcentage de territoire
- score
- compteur d'éliminations
- pièces à ramasser
- pause avec Échap
- écran de fin
- rejouer
- retour menu

## Lancement
Ouvrir le dossier godot dans Godot puis lancer le projet avec F6/F5 ou le bouton ▶.

## Structure
- Main.tscn : scène d'entrée
- scripts/Main.gd : menu et écran de fin
- scripts/Game.gd : partie, bots, HUD, score et collisions
- scripts/Territory.gd : propriété et capture de territoire
- scripts/Agent.gd : logique commune joueur/bots
- scripts/Player.gd : contrôles clavier
- scripts/Bot.gd : IA des bots
