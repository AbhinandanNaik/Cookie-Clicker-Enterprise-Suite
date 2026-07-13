package com.cookieclicker.backend.dto;

public record LeaderboardDto(
        String username,
        double totalBaked,
        double cookies,
        double cps
) {}
