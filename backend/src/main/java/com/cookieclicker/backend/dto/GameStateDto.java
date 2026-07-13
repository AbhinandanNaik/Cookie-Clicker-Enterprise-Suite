package com.cookieclicker.backend.dto;

public record GameStateDto(
        double cookies,
        long clicks,
        double totalBaked,
        int cursorsCount,
        int grandmasCount,
        int farmsCount,
        int minesCount,
        int factoriesCount,
        int templesCount,
        Boolean frenzyActive
) {}
