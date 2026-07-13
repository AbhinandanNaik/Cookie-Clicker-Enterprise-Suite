package com.cookieclicker.backend.dto;

public record AuthResponse(
        String token,
        String username
) {}
