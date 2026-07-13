package com.cookieclicker.backend.service;

import com.cookieclicker.backend.model.GameState;
import com.cookieclicker.backend.model.User;
import com.cookieclicker.backend.repository.GameStateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GameStateService {

    private final GameStateRepository gameStateRepository;
    private final CheatDetectionService cheatDetectionService;

    public GameStateService(GameStateRepository gameStateRepository, CheatDetectionService cheatDetectionService) {
        this.gameStateRepository = gameStateRepository;
        this.cheatDetectionService = cheatDetectionService;
    }

    @Transactional(readOnly = true)
    public GameState getOrCreateGameState(User user) {
        return gameStateRepository.findByUser(user)
                .orElseGet(() -> {
                    GameState state = new GameState(user);
                    return gameStateRepository.save(state);
                });
    }

    @Transactional
    public GameState saveGameState(User user, GameState proposed, boolean hasActiveFrenzy) {
        GameState current = getOrCreateGameState(user);

        // Run security anti-cheat validation
        boolean isValid = cheatDetectionService.validateTransition(current, proposed, hasActiveFrenzy);
        if (!isValid) {
            throw new IllegalArgumentException("Suspicious game state transaction detected. Sync rejected.");
        }

        // Apply changes
        current.setCookies(proposed.getCookies());
        current.setClicks(proposed.getClicks());
        current.setTotalBaked(proposed.getTotalBaked());
        current.setCursorsCount(proposed.getCursorsCount());
        current.setGrandmasCount(proposed.getGrandmasCount());
        current.setFarmsCount(proposed.getFarmsCount());
        current.setMinesCount(proposed.getMinesCount());
        current.setFactoriesCount(proposed.getFactoriesCount());
        current.setTemplesCount(proposed.getTemplesCount());
        current.setLastSavedAt(System.currentTimeMillis());

        return gameStateRepository.save(current);
    }
}
