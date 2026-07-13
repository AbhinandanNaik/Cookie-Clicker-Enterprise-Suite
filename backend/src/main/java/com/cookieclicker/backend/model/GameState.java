package com.cookieclicker.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "game_states")
public class GameState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", referencedColumnName = "id", unique = true)
    private User user;

    @Column(nullable = false)
    private double cookies = 0;

    @Column(nullable = false)
    private long clicks = 0;

    @Column(name = "total_baked", nullable = false)
    private double totalBaked = 0;

    @Column(name = "cursors_count", nullable = false)
    private int cursorsCount = 0;

    @Column(name = "grandmas_count", nullable = false)
    private int grandmasCount = 0;

    @Column(name = "farms_count", nullable = false)
    private int farmsCount = 0;

    @Column(name = "mines_count", nullable = false)
    private int minesCount = 0;

    @Column(name = "factories_count", nullable = false)
    private int factoriesCount = 0;

    @Column(name = "temples_count", nullable = false)
    private int templesCount = 0;

    @Column(name = "last_saved_at", nullable = false)
    private long lastSavedAt;

    public GameState() {
        this.lastSavedAt = System.currentTimeMillis();
    }

    public GameState(User user) {
        this.user = user;
        this.lastSavedAt = System.currentTimeMillis();
    }

    // Helper to calculate CPS on server side
    public double calculateCps() {
        return (this.cursorsCount * 0.1) +
               (this.grandmasCount * 1.0) +
               (this.farmsCount * 8.0) +
               (this.minesCount * 47.0) +
               (this.factoriesCount * 260.0) +
               (this.templesCount * 1400.0);
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public double getCookies() {
        return cookies;
    }

    public void setCookies(double cookies) {
        this.cookies = cookies;
    }

    public long getClicks() {
        return clicks;
    }

    public void setClicks(long clicks) {
        this.clicks = clicks;
    }

    public double getTotalBaked() {
        return totalBaked;
    }

    public void setTotalBaked(double totalBaked) {
        this.totalBaked = totalBaked;
    }

    public int getCursorsCount() {
        return cursorsCount;
    }

    public void setCursorsCount(int cursorsCount) {
        this.cursorsCount = cursorsCount;
    }

    public int getGrandmasCount() {
        return grandmasCount;
    }

    public void setGrandmasCount(int grandmasCount) {
        this.grandmasCount = grandmasCount;
    }

    public int getFarmsCount() {
        return farmsCount;
    }

    public void setFarmsCount(int farmsCount) {
        this.farmsCount = farmsCount;
    }

    public int getMinesCount() {
        return minesCount;
    }

    public void setMinesCount(int minesCount) {
        this.minesCount = minesCount;
    }

    public int getFactoriesCount() {
        return factoriesCount;
    }

    public void setFactoriesCount(int factoriesCount) {
        this.factoriesCount = factoriesCount;
    }

    public int getTemplesCount() {
        return templesCount;
    }

    public void setTemplesCount(int templesCount) {
        this.templesCount = templesCount;
    }

    public long getLastSavedAt() {
        return lastSavedAt;
    }

    public void setLastSavedAt(long lastSavedAt) {
        this.lastSavedAt = lastSavedAt;
    }
}
