package com.cookieclicker.backend.repository;

import com.cookieclicker.backend.model.GameState;
import com.cookieclicker.backend.model.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GameStateRepository extends JpaRepository<GameState, Long> {
    Optional<GameState> findByUser(User user);

    @Query("SELECT gs FROM GameState gs JOIN FETCH gs.user u ORDER BY gs.totalBaked DESC")
    List<GameState> findTopPlayers(Pageable pageable);
}
