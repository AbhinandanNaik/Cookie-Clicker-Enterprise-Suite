package com.cookieclicker.backend.controller;

import com.cookieclicker.backend.dto.LeaderboardDto;
import com.cookieclicker.backend.service.LeaderboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @GetMapping
    public ResponseEntity<List<LeaderboardDto>> getLeaderboard(@RequestParam(defaultValue = "10") int limit) {
        // Cap the maximum limit for enterprise security and stability
        int cappedLimit = Math.min(limit, 100);
        List<LeaderboardDto> leaderboard = leaderboardService.getTopPlayers(cappedLimit);
        return ResponseEntity.ok(leaderboard);
    }
}
