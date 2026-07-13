package com.cookieclicker.desktop;

import com.formdev.flatlaf.FlatDarkLaf;
import javax.swing.SwingUtilities;

public class App {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            FlatDarkLaf.setup();
            new CookieClicker().setVisible(true);
        });
    }
}
