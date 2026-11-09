"use client";
import { createContext, useContext } from "react";

/** The active theme identity is independent of lazy UI resolution and its CSS. */
export const ThemeContext = createContext("argon");
export const useThemeId = () => useContext(ThemeContext);
