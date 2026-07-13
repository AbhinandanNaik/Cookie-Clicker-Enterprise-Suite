package com.cookieclicker.backend.service;

import com.cookieclicker.backend.model.GameState;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CheatDetectionServiceTest {

    private CheatDetectionService cheatDetectionService;
    private GameState current;
    private GameState proposed;

    @BeforeEach
    void setUp() {
        cheatDetectionService = new CheatDetectionService();
        current = new GameState();
        proposed = new GameState();

        long now = System.currentTimeMillis();
        current.setLastSavedAt(now - 10000); // 10 seconds ago
    }

    @Test
    void validateTransition_withLegitimateState_shouldReturnTrue() {
        // Current state: 0 cookies, 0 clicks, 0 upgrades
        current.setCookies(0);
        current.setClicks(0);
        current.setLastSavedAt(System.currentTimeMillis() - 10000); // 10s elapsed

        // Proposed: 5 clicks, click power is 1, so 5 cookies produced
        proposed.setCookies(5);
        proposed.setClicks(5);
        proposed.setTotalBaked(5);

        assertTrue(cheatDetectionService.validateTransition(current, proposed, false));
    }

    @Test
    void validateTransition_withExcessiveClicks_shouldReturnFalse() {
        current.setCookies(0);
        current.setClicks(0);
        current.setLastSavedAt(System.currentTimeMillis() - 10000); // 10s elapsed

        // Proposed: 500 clicks in 10s (50 clicks/sec, exceeds limit of 25 clicks/sec)
        proposed.setCookies(500);
        proposed.setClicks(500);
        proposed.setTotalBaked(500);

        assertFalse(cheatDetectionService.validateTransition(current, proposed, false));
    }

    @Test
    void validateTransition_withUnearnedCookies_shouldReturnFalse() {
        current.setCookies(0);
        current.setClicks(0);
        current.setLastSavedAt(System.currentTimeMillis() - 10000); // 10s elapsed

        // Proposed: only 5 clicks but claims 10,000 cookies (cheating)
        proposed.setCookies(10000);
        proposed.setClicks(5);
        proposed.setTotalBaked(10000);

        assertFalse(cheatDetectionService.validateTransition(current, proposed, false));
    }

    @Test
    void validateTransition_withUnearnedUpgrades_shouldReturnFalse() {
        current.setCookies(0);
        current.setClicks(0);
        current.setLastSavedAt(System.currentTimeMillis() - 10000); // 10s elapsed

        // Proposed: 0 cookies but claims 50 Grandmas (each Grandma base cost is 100)
        // Net worth proposed will be huge compared to current net worth + max generated
        proposed.setCookies(0);
        proposed.setClicks(0);
        proposed.setGrandmasCount(50);

        assertFalse(cheatDetectionService.validateTransition(current, proposed, false));
    }

    @Test
    void validateTransition_withFrenzyActive_shouldAllowHigherRate() {
        current.setCookies(100);
        current.setClicks(10);
        current.setLastSavedAt(System.currentTimeMillis() - 2000); // 2s elapsed

        // Under normal settings, 2s * 25 clicks/s = 50 clicks max.
        // With Click Frenzy (777x click value), click value is 777.
        // Proposed: 20 clicks delta = 20 * 777 = 15,540 cookies earned.
        proposed.setClicks(30);
        proposed.setCookies(15640);
        proposed.setTotalBaked(15740);

        assertTrue(cheatDetectionService.validateTransition(current, proposed, true));
    }
}
