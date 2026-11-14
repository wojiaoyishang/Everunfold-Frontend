"""Sphinx settings for the published Everunfold Frontend manual."""

project = "Everunfold 前端"
author = "Everunfold"
copyright = "2026, Everunfold"
release = "预发布"

language = "zh_CN"
root_doc = "index"
nitpicky = True

html_theme = "sphinx_rtd_theme"
html_theme_options = {
    "navigation_depth": 3,
    "collapse_navigation": False,
    "titles_only": True,
}
templates_path = ["_templates"]
html_static_path = ["_static"]
html_css_files = ["handbook.css"]
html_js_files = ["handbook.js"]
html_search_language = "zh"
html_show_sourcelink = True
