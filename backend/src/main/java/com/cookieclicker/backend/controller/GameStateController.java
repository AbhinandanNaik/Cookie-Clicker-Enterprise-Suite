package com.cookieclicker.backend.controller;

import com.cookieclicker.backend.dto.GameStateDto;
import com.cookieclicker.backend.model.GameState;
import com.cookieclicker.backend.model.User;
import com.cookieclicker.backend.repository.UserRepository;
import com.cookieclicker.backend.service.GameStateService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/game")
public class GameStateController {

    private final GameStateService gameStateService;
    private final UserRepository userRepository;

    public GameStateController(GameStateService gameStateService, UserRepository userRepository) {
        this.gameStateService = gameStateService;
        this.userRepository = userRepository;
    }

    private User getUserFromPrincipal(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getName()));
    }

    private GameStateDto mapToDto(GameState state) {
        return new GameStateDto(
                state.getCookies(),
                state.getClicks(),
                state.getTotalBaked(),
                state.getCursorsCount(),
                state.getGrandmasCount(),
                state.getFarmsCount(),
                state.getMinesCount(),
                state.getFactoriesCount(),
                state.getTemplesCount(),
                false // frenzyActive is request-only for validation check
        );
    }

    private GameState mapToEntity(GameStateDto dto) {
        GameState state = new GameState();
        state.setCookies(dto.cookies());
        state.setClicks(dto.clicks());
        state.setTotalBaked(dto.totalBaked());
        state.setCursorsCount(dto.cursorsCount());
        state.setGrandmasCount(dto.grandmasCount());
        state.setFarmsCount(dto.farmsCount());
        state.setMinesCount(dto.minesCount());
        state.setFactoriesCount(dto.factoriesCount());
        state.setTemplesCount(dto.templesCount());
        return state;
    }

    @GetMapping("/state")
    public ResponseEntity<GameStateDto> getGameState(Principal principal) {
        User user = getUserFromPrincipal(principal);
        GameState state = gameStateService.getOrCreateGameState(user);
        return ResponseEntity.ok(mapToDto(state));
    }

    @PostMapping("/state")
    public ResponseEntity<?> saveGameState(Principal principal, @RequestBody GameStateDto proposedDto) {
        User user = getUserFromPrincipal(principal);
        GameState proposed = mapToEntity(proposedDto);
        boolean hasActiveFrenzy = proposedDto.frenzyActive() != null && proposedDto.frenzyActive();

        try {
            GameState saved = gameStateService.saveGameState(user, proposed, hasActiveFrenzy);
            return ResponseEntity.ok(mapToDto(saved));
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
