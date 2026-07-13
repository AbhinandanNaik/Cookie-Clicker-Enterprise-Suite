package com.cookieclicker.backend.service;

import com.cookieclicker.backend.model.GameState;
import org.springframework.stereotype.Service;

@Service
public class CheatDetectionService {

    // Upgrade constants
    public static final double CURSOR_BASE_COST = 15;
    public static final double GRANDMA_BASE_COST = 100;
    public static final double FARM_BASE_COST = 1100;
    public static final double MINE_BASE_COST = 12000;
    public static final double FACTORY_BASE_COST = 130000;
    public static final double TEMPLE_BASE_COST = 1400000;

    public static final double COST_MULTIPLIER = 1.15;
    public static final double MAX_HUMAN_CLICKS_PER_SECOND = 25.0;

    /**
     * Calculates cumulative cost of buying N items of an upgrade.
     */
    public double getCumulativeCost(double baseCost, int count) {
        if (count <= 0) return 0;
        // Cost = Sum_{i=0}^{count-1} (baseCost * 1.15^i)
        // Using geometric series sum: baseCost * (1.15^count - 1) / (1.15 - 1)
        return baseCost * (Math.pow(COST_MULTIPLIER, count) - 1.0) / (COST_MULTIPLIER - 1.0);
    }

    /**
     * Calculates the player's "Net Worth" in cookies (current cookies + total spent on upgrades).
     */
    public double calculateNetWorth(double currentCookies, int cursors, int grandmas, int farms, int mines, int factories, int temples) {
        double spent = getCumulativeCost(CURSOR_BASE_COST, cursors)
                + getCumulativeCost(GRANDMA_BASE_COST, grandmas)
                + getCumulativeCost(FARM_BASE_COST, farms)
                + getCumulativeCost(MINE_BASE_COST, mines)
                + getCumulativeCost(FACTORY_BASE_COST, factories)
                + getCumulativeCost(TEMPLE_BASE_COST, temples);
        return currentCookies + spent;
    }

    /**
     * Validates if a proposed state transition is legitimate.
     * @return true if valid, false if suspected cheating
     */
    public boolean validateTransition(GameState current, GameState proposed, boolean hasActiveFrenzy) {
        long now = System.currentTimeMillis();
        long lastSaved = current.getLastSavedAt();
        
        // Time delta in seconds
        double deltaSeconds = (now - lastSaved) / 1000.0;
        
        // Safety check for clock manipulation or instant requests (under 0.5s)
        if (deltaSeconds < -10.0) {
            return false; // Clock wound back significantly
        }
        if (deltaSeconds < 0.5) {
            deltaSeconds = 0.5; // Cap minimum time delta to prevent divide-by-zero or spam rejects
        }

        // Clicks validation
        long clicksDelta = proposed.getClicks() - current.getClicks();
        if (clicksDelta < 0) {
            return false; // Clicks cannot decrease
        }

        double maxClicksAllowed = MAX_HUMAN_CLICKS_PER_SECOND * deltaSeconds;
        // Include a small buffer of 50 clicks for latency spikes or accumulated clicks
        if (clicksDelta > maxClicksAllowed + 50) {
            return false; // Exceeded click rate limit
        }

        // Calculate click power based on Cursors
        double clickPower = 1.0 + (proposed.getCursorsCount() * 0.1);
        if (hasActiveFrenzy) {
            clickPower *= 777.0; // Golden cookie Click Frenzy multiplier
        }

        // Calculate CPS of the proposed game state
        double cps = proposed.calculateCps();
        double activeCps = hasActiveFrenzy ? cps * 7.0 : cps;

        // Calculate Net Worths
        double currentNetWorth = calculateNetWorth(
                current.getCookies(),
                current.getCursorsCount(),
                current.getGrandmasCount(),
                current.getFarmsCount(),
                current.getMinesCount(),
                current.getFactoriesCount(),
                current.getTemplesCount()
        );

        double proposedNetWorth = calculateNetWorth(
                proposed.getCookies(),
                proposed.getCursorsCount(),
                proposed.getGrandmasCount(),
                proposed.getFarmsCount(),
                proposed.getMinesCount(),
                proposed.getFactoriesCount(),
                proposed.getTemplesCount()
        );

        // Max possible cookies generated since last save
        double maxGenerated = (activeCps * deltaSeconds) + (clicksDelta * clickPower);

        // Add a buffer to prevent false-positives due to rounding, network lags, etc.
        double buffer = 500.0 + (0.1 * currentNetWorth); // 500 flat + 10% of net worth

        return proposedNetWorth <= (currentNetWorth + maxGenerated + buffer);
    }
}
