package com.cookieclicker.backend.service;

import com.cookieclicker.backend.dto.LeaderboardDto;
import com.cookieclicker.backend.model.GameState;
import com.cookieclicker.backend.repository.GameStateRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class LeaderboardService {

    private final GameStateRepository gameStateRepository;

    public LeaderboardService(GameStateRepository gameStateRepository) {
        this.gameStateRepository = gameStateRepository;
    }

    @Transactional(readOnly = true)
    public List<LeaderboardDto> getTopPlayers(int limit) {
        // Fetch top players sorted by total cookies baked
        List<GameState> topStates = gameStateRepository.findTopPlayers(PageRequest.of(0, limit));
        
        return topStates.stream()
                .map(gs -> new LeaderboardDto(
                        gs.getUser().getUsername(),
                        gs.getTotalBaked(),
                        gs.getCookies(),
                        gs.calculateCps()
                ))
                .collect(Collectors.toList());
    }
}
