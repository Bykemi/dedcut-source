// Pas de fenêtre de console en plus de DedCut
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    dedcut_lib::run()
}
