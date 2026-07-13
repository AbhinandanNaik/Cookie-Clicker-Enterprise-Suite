package com.cookieclicker.desktop;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import javax.imageio.ImageIO;
import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.image.BufferedImage;
import java.io.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class CookieClicker extends JFrame {

    // Server URI
    private static final String API_BASE = "http://localhost:8080/api";

    // Core Game Data (State)
    private double cookies = 0;
    private long clicks = 0;
    private double totalBaked = 0;

    // Upgrades
    private int cursors = 0;
    private int grandmas = 0;
    private int farms = 0;
    private int mines = 0;
    private int factories = 0;
    private int temples = 0;

    // Network State
    private String jwtToken = null;
    private String username = "Guest";
    private boolean isOnline = false;

    // UI Components
    private JLabel cookiesLabel;
    private JLabel cpsLabel;
    private JLabel clicksLabel;

    // Upgrades UI Buttons & Labels
    private final Map<String, JButton> buyButtons = new HashMap<>();
    private final Map<String, JLabel> upgradeInfoLabels = new HashMap<>();

    // Leaderboard Table
    private DefaultTableModel leaderboardModel;

    // Account Tab
    private JTextField userField;
    private JPasswordField passField;
    private JLabel authStatusLabel;

    // Local save file name
    private static final String SAVE_FILE = "cookie_clicker_save.json";

    // Http Client
    private final HttpClient httpClient;
    private final Gson gson;

    public CookieClicker() {
        super("Cookie Clicker: Enterprise Client");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setSize(800, 700);
        setMinimumSize(new Dimension(650, 600));
        setLocationRelativeTo(null);

        this.httpClient = HttpClient.newBuilder().build();
        this.gson = new Gson();

        // 1. Load any local save cache
        loadLocalSave();

        // 2. Build GUI
        initComponents();

        // 3. Start Background Game Engine and Sync Loops
        startGameEngine();

        // 4. Start auto-save sync loop
        startAutoSync();
    }

    private void initComponents() {
        JTabbedPane tabbedPane = new JTabbedPane();

        // Tab 1: Game Client
        tabbedPane.addTab("Game Client", createGameTab());

        // Tab 2: Rankings
        tabbedPane.addTab("Global Rankings", createLeaderboardTab());

        // Tab 3: Account Settings
        tabbedPane.addTab("Account Security", createAccountTab());

        add(tabbedPane);
    }

    private JPanel createGameTab() {
        JPanel gamePanel = new JPanel(new BorderLayout());

        // Cookie Clicking Center
        JPanel cookieCenter = new JPanel(new GridBagLayout());
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(10, 10, 10, 10);
        gbc.gridx = 0;

        // Big visual stats
        cookiesLabel = new JLabel("0 Cookies", SwingConstants.CENTER);
        cookiesLabel.setFont(new Font("Segoe UI", Font.BOLD, 36));
        gbc.gridy = 0;
        cookieCenter.add(cookiesLabel, gbc);

        cpsLabel = new JLabel("0.0 CPS", SwingConstants.CENTER);
        cpsLabel.setFont(new Font("Segoe UI", Font.PLAIN, 18));
        cpsLabel.setForeground(Color.GRAY);
        gbc.gridy = 1;
        cookieCenter.add(cpsLabel, gbc);

        clicksLabel = new JLabel("Clicks: 0", SwingConstants.CENTER);
        clicksLabel.setFont(new Font("Segoe UI", Font.PLAIN, 14));
        gbc.gridy = 2;
        cookieCenter.add(clicksLabel, gbc);

        // Cookie button
        JButton cookieButton = null;
        try {
            InputStream is = getClass().getResourceAsStream("/resources/cookie.png");
            if (is != null) {
                BufferedImage img = ImageIO.read(is);
                Image dimg = img.getScaledInstance(200, 200, Image.SCALE_SMOOTH);
                cookieButton = new JButton(new ImageIcon(dimg));
                cookieButton.setBorder(BorderFactory.createEmptyBorder());
                cookieButton.setContentAreaFilled(false);
                cookieButton.setFocusPainted(false);
            }
        } catch (Exception e) {
            System.err.println("Could not load cookie image, falling back: " + e);
        }

        if (cookieButton == null) {
            cookieButton = new JButton("CLICK ME");
            cookieButton.setPreferredSize(new Dimension(200, 200));
            cookieButton.setFont(new Font("Segoe UI", Font.BOLD, 24));
        }

        cookieButton.addActionListener(e -> clickCookie());
        gbc.gridy = 3;
        cookieCenter.add(cookieButton, gbc);

        gamePanel.add(cookieCenter, BorderLayout.CENTER);

        // Sidebar - Upgrade Store
        JPanel storePanel = new JPanel();
        storePanel.setLayout(new BoxLayout(storePanel, BoxLayout.Y_AXIS));
        storePanel.setBorder(BorderFactory.createTitledBorder("Enterprise Shop"));

        addUpgradeStoreItem(storePanel, "cursors", "Cursor (+0.1 CPS)", 15);
        addUpgradeStoreItem(storePanel, "grandmas", "Grandma (+1.0 CPS)", 100);
        addUpgradeStoreItem(storePanel, "farms", "Farm (+8.0 CPS)", 1100);
        addUpgradeStoreItem(storePanel, "mines", "Mine (+47.0 CPS)", 12000);
        addUpgradeStoreItem(storePanel, "factories", "Factory (+260.0 CPS)", 130000);
        addUpgradeStoreItem(storePanel, "temples", "Temple (+1400.0 CPS)", 1400000);

        JScrollPane scrollPane = new JScrollPane(storePanel);
        scrollPane.setPreferredSize(new Dimension(300, 700));
        gamePanel.add(scrollPane, BorderLayout.EAST);

        return gamePanel;
    }

    private void addUpgradeStoreItem(JPanel parent, String id, String labelText, double baseCost) {
        JPanel itemPanel = new JPanel(new GridLayout(2, 1, 5, 2));
        itemPanel.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createEmptyBorder(5, 5, 5, 5),
                BorderFactory.createLineBorder(Color.DARK_GRAY, 1, true)
        ));
        itemPanel.setMaximumSize(new Dimension(280, 70));

        JPanel top = new JPanel(new BorderLayout());
        JLabel nameLabel = new JLabel(labelText);
        nameLabel.setFont(new Font("Segoe UI", Font.BOLD, 13));
        top.add(nameLabel, BorderLayout.WEST);

        JLabel qtyLabel = new JLabel("x0", SwingConstants.RIGHT);
        qtyLabel.setFont(new Font("Segoe UI", Font.BOLD, 12));
        top.add(qtyLabel, BorderLayout.EAST);
        upgradeInfoLabels.put(id + "_qty", qtyLabel);

        JPanel bottom = new JPanel(new BorderLayout());
        JLabel costLabel = new JLabel("Cost: " + (int)baseCost);
        costLabel.setForeground(new Color(234, 179, 8)); // Golden
        bottom.add(costLabel, BorderLayout.WEST);
        upgradeInfoLabels.put(id + "_cost", costLabel);

        JButton buyBtn = new JButton("Acquire");
        buyBtn.addActionListener(e -> buyUpgrade(id, baseCost));
        bottom.add(buyBtn, BorderLayout.EAST);
        buyButtons.put(id, buyBtn);

        itemPanel.add(top);
        itemPanel.add(bottom);
        parent.add(itemPanel);
        parent.add(Box.createRigidArea(new Dimension(0, 5)));
    }

    private JPanel createLeaderboardTab() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));

        JLabel title = new JLabel("Global Leaderboard", SwingConstants.CENTER);
        title.setFont(new Font("Segoe UI", Font.BOLD, 22));
        panel.add(title, BorderLayout.NORTH);

        String[] cols = {"Rank", "Player", "Total Baked", "CPS"};
        leaderboardModel = new DefaultTableModel(cols, 0) {
            @Override
            public boolean isCellEditable(int r, int c) { return false; }
        };
        JTable table = new JTable(leaderboardModel);
        table.setRowHeight(25);
        table.setFont(new Font("Segoe UI", Font.PLAIN, 14));
        table.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 14));

        panel.add(new JScrollPane(table), BorderLayout.CENTER);

        JButton refreshBtn = new JButton("Sync & Fetch Leaderboard");
        refreshBtn.setFont(new Font("Segoe UI", Font.BOLD, 14));
        refreshBtn.addActionListener(e -> fetchLeaderboard());
        panel.add(refreshBtn, BorderLayout.SOUTH);

        return panel;
    }

    private JPanel createAccountTab() {
        JPanel panel = new JPanel(new GridBagLayout());
        panel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));

        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(10, 10, 10, 10);
        gbc.fill = GridBagConstraints.HORIZONTAL;

        JLabel title = new JLabel("Enterprise Portal", SwingConstants.CENTER);
        title.setFont(new Font("Segoe UI", Font.BOLD, 24));
        gbc.gridx = 0;
        gbc.gridy = 0;
        gbc.gridwidth = 2;
        panel.add(title, gbc);

        authStatusLabel = new JLabel("Playing Offline Mode (Local Cache)", SwingConstants.CENTER);
        authStatusLabel.setFont(new Font("Segoe UI", Font.ITALIC, 14));
        authStatusLabel.setForeground(Color.LIGHT_GRAY);
        gbc.gridy = 1;
        panel.add(authStatusLabel, gbc);

        gbc.gridwidth = 1;
        gbc.gridy = 2;
        panel.add(new JLabel("Username:"), gbc);

        userField = new JTextField(15);
        gbc.gridx = 1;
        panel.add(userField, gbc);

        gbc.gridx = 0;
        gbc.gridy = 3;
        panel.add(new JLabel("Password:"), gbc);

        passField = new JPasswordField(15);
        gbc.gridx = 1;
        panel.add(passField, gbc);

        JPanel btnPanel = new JPanel(new GridLayout(1, 2, 10, 0));
        JButton loginBtn = new JButton("Login");
        loginBtn.addActionListener(e -> performAuth("login"));
        btnPanel.add(loginBtn);

        JButton regBtn = new JButton("Register");
        regBtn.addActionListener(e -> performAuth("register"));
        btnPanel.add(regBtn);

        gbc.gridx = 0;
        gbc.gridy = 4;
        gbc.gridwidth = 2;
        panel.add(btnPanel, gbc);

        JButton logoutBtn = new JButton("Logout & Play Offline");
        logoutBtn.addActionListener(e -> performLogout());
        gbc.gridy = 5;
        panel.add(logoutBtn, gbc);

        return panel;
    }

    // Game Core Operations
    private void clickCookie() {
        double power = 1.0 + (cursors * 0.1);
        cookies += power;
        totalBaked += power;
        clicks++;
        updateLabels();
    }

    private void buyUpgrade(String id, double baseCost) {
        double cost = getUpgradeCost(id, baseCost);
        if (cookies >= cost) {
            cookies -= cost;
            incrementUpgrade(id);
            updateLabels();
            updateStoreUI();
        } else {
            Toolkit.getDefaultToolkit().beep();
        }
    }

    private double getUpgradeCost(String id, double baseCost) {
        int count = getUpgradeCount(id);
        return Math.floor(baseCost * Math.pow(1.15, count));
    }

    private int getUpgradeCount(String id) {
        return switch (id) {
            case "cursors" -> cursors;
            case "grandmas" -> grandmas;
            case "farms" -> farms;
            case "mines" -> mines;
            case "factories" -> factories;
            case "temples" -> temples;
            default -> 0;
        };
    }

    private void incrementUpgrade(String id) {
        switch (id) {
            case "cursors" -> cursors++;
            case "grandmas" -> grandmas++;
            case "farms" -> farms++;
            case "mines" -> mines++;
            case "factories" -> factories++;
            case "temples" -> temples++;
        }
    }

    private double calculateCps() {
        return (cursors * 0.1) +
               (grandmas * 1.0) +
               (farms * 8.0) +
               (mines * 47.0) +
               (factories * 260.0) +
               (temples * 1400.0);
    }

    private void updateLabels() {
        cookiesLabel.setText(String.format("%,d Cookies", (long)cookies));
        cpsLabel.setText(String.format("%,.1f CPS", calculateCps()));
        clicksLabel.setText("Clicks: " + clicks);
    }

    private void updateStoreUI() {
        updateStoreItemUI("cursors", 15);
        updateStoreItemUI("grandmas", 100);
        updateStoreItemUI("farms", 1100);
        updateStoreItemUI("mines", 12000);
        updateStoreItemUI("factories", 130000);
        updateStoreItemUI("temples", 1400000);
    }

    private void updateStoreItemUI(String id, double baseCost) {
        int qty = getUpgradeCount(id);
        double cost = getUpgradeCost(id, baseCost);

        JLabel qtyLabel = upgradeInfoLabels.get(id + "_qty");
        if (qtyLabel != null) qtyLabel.setText("x" + qty);

        JLabel costLabel = upgradeInfoLabels.get(id + "_cost");
        if (costLabel != null) costLabel.setText("Cost: " + (int)cost);
    }

    // Loops
    private void startGameEngine() {
        ScheduledExecutorService engine = Executors.newSingleThreadScheduledExecutor();
        engine.scheduleAtFixedRate(() -> {
            double cps = calculateCps();
            if (cps > 0) {
                // Accumulate per 100ms
                double added = cps * 0.1;
                cookies += added;
                totalBaked += added;
                SwingUtilities.invokeLater(this::updateLabels);
            }
        }, 100, 100, TimeUnit.MILLISECONDS);
    }

    private void startAutoSync() {
        ScheduledExecutorService syncTimer = Executors.newSingleThreadScheduledExecutor();
        syncTimer.scheduleAtFixedRate(() -> {
            if (isOnline && jwtToken != null) {
                syncGameStateToServer();
            } else {
                saveToLocal();
            }
        }, 10, 10, TimeUnit.SECONDS);
    }

    // Network Sync & Auth
    private void performAuth(String type) {
        String user = userField.getText();
        String pass = new String(passField.getPassword());
        if (user.isBlank() || pass.isBlank()) {
            JOptionPane.showMessageDialog(this, "Fields cannot be blank", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        SwingUtilities.invokeLater(() -> authStatusLabel.setText("Authenticating..."));

        Executors.newSingleThreadExecutor().submit(() -> {
            try {
                String payload = String.format("{\"username\":\"%s\",\"password\":\"%s\"}", user, pass);
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(API_BASE + "/auth/" + type))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(payload))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    Map<String, String> data = gson.fromJson(response.body(), new TypeToken<Map<String, String>>(){}.getType());
                    jwtToken = data.get("token");
                    username = data.get("username");
                    isOnline = true;

                    SwingUtilities.invokeLater(() -> {
                        authStatusLabel.setText("Connected as: " + username);
                        authStatusLabel.setForeground(new Color(16, 185, 129)); // Emerald Green
                        passField.setText("");
                        JOptionPane.showMessageDialog(this, "Welcome " + username + "! Cloud sync active.");
                        loadGameStateFromServer();
                    });
                } else {
                    SwingUtilities.invokeLater(() -> {
                        authStatusLabel.setText("Auth failed. Local offline backup active.");
                        authStatusLabel.setForeground(Color.RED);
                        JOptionPane.showMessageDialog(this, "Authentication failed. Check credentials.", "Auth Error", JOptionPane.ERROR_MESSAGE);
                    });
                }
            } catch (Exception e) {
                SwingUtilities.invokeLater(() -> {
                    authStatusLabel.setText("Network error. Play offline.");
                    authStatusLabel.setForeground(Color.ORANGE);
                    JOptionPane.showMessageDialog(this, "Cannot connect to server. Running offline.", "Network Error", JOptionPane.WARNING_MESSAGE);
                });
            }
        });
    }

    private void performLogout() {
        jwtToken = null;
        username = "Guest";
        isOnline = false;
        authStatusLabel.setText("Playing Offline Mode (Local Cache)");
        authStatusLabel.setForeground(Color.LIGHT_GRAY);
        JOptionPane.showMessageDialog(this, "Logged out. Using local cache.");
    }

    private void loadGameStateFromServer() {
        if (jwtToken == null) return;
        Executors.newSingleThreadExecutor().submit(() -> {
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(API_BASE + "/game/state"))
                        .header("Authorization", "Bearer " + jwtToken)
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    GameStateDto dto = gson.fromJson(response.body(), GameStateDto.class);
                    cookies = dto.cookies;
                    clicks = dto.clicks;
                    totalBaked = dto.totalBaked;
                    cursors = dto.cursorsCount;
                    grandmas = dto.grandmasCount;
                    farms = dto.farmsCount;
                    mines = dto.minesCount;
                    factories = dto.factoriesCount;
                    temples = dto.templesCount;

                    SwingUtilities.invokeLater(() -> {
                        updateLabels();
                        updateStoreUI();
                    });
                }
            } catch (Exception e) {
                System.err.println("Failed to fetch state from server: " + e);
            }
        });
    }

    private void syncGameStateToServer() {
        if (jwtToken == null) return;
        try {
            String payload = String.format(java.util.Locale.US,
                "{\"cookies\":%.2f,\"clicks\":%d,\"totalBaked\":%.2f,\"cursorsCount\":%d,\"grandmasCount\":%d,\"farmsCount\":%d,\"minesCount\":%d,\"factoriesCount\":%d,\"templesCount\":%d}",
                cookies, clicks, totalBaked, cursors, grandmas, farms, mines, factories, temples
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_BASE + "/game/state"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + jwtToken)
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                System.err.println("Save state sync rejected by server (cheating detected or bad session)");
            }
        } catch (Exception e) {
            System.err.println("Could not sync with server: " + e);
        }
    }

    private void fetchLeaderboard() {
        Executors.newSingleThreadExecutor().submit(() -> {
            try {
                // If online, force state sync first
                if (isOnline && jwtToken != null) {
                    syncGameStateToServer();
                }

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(API_BASE + "/leaderboard"))
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    List<LeaderboardDto> list = gson.fromJson(response.body(), new TypeToken<List<LeaderboardDto>>(){}.getType());
                    SwingUtilities.invokeLater(() -> {
                        leaderboardModel.setRowCount(0);
                        int rank = 1;
                        for (LeaderboardDto item : list) {
                            leaderboardModel.addRow(new Object[]{
                                    "#" + rank++,
                                    item.username,
                                    String.format("%,d", (long)item.totalBaked),
                                    String.format("%,.1f", item.cps)
                            });
                        }
                    });
                }
            } catch (Exception e) {
                SwingUtilities.invokeLater(() -> JOptionPane.showMessageDialog(this, "Could not fetch leaderboard.", "Error", JOptionPane.ERROR_MESSAGE));
            }
        });
    }

    // Local Saving
    private void saveToLocal() {
        try (Writer writer = new FileWriter(SAVE_FILE, StandardCharsets.UTF_8)) {
            GameStateDto dto = new GameStateDto();
            dto.cookies = cookies;
            dto.clicks = clicks;
            dto.totalBaked = totalBaked;
            dto.cursorsCount = cursors;
            dto.grandmasCount = grandmas;
            dto.farmsCount = farms;
            dto.minesCount = mines;
            dto.factoriesCount = factories;
            dto.templesCount = temples;

            gson.toJson(dto, writer);
        } catch (Exception e) {
            System.err.println("Could not save to local storage: " + e);
        }
    }

    private void loadLocalSave() {
        File file = new File(SAVE_FILE);
        if (!file.exists()) return;
        try (Reader reader = new FileReader(file, StandardCharsets.UTF_8)) {
            GameStateDto dto = gson.fromJson(reader, GameStateDto.class);
            if (dto != null) {
                this.cookies = dto.cookies;
                this.clicks = dto.clicks;
                this.totalBaked = dto.totalBaked;
                this.cursors = dto.cursorsCount;
                this.grandmas = dto.grandmasCount;
                this.farms = dto.farmsCount;
                this.mines = dto.minesCount;
                this.factories = dto.factoriesCount;
                this.temples = dto.templesCount;
            }
        } catch (Exception e) {
            System.err.println("Could not load local save: " + e);
        }
    }

    // Helper classes for parsing
    private static class GameStateDto {
        double cookies;
        long clicks;
        double totalBaked;
        int cursorsCount;
        int grandmasCount;
        int farmsCount;
        int minesCount;
        int factoriesCount;
        int templesCount;
    }

    private static class LeaderboardDto {
        String username;
        double totalBaked;
        double cps;
    }
}
