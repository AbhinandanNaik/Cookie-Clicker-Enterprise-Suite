import { useState, useEffect, useRef } from 'react';
import { 
  Cookie, 
  TrendingUp, 
  Award, 
  LogOut, 
  Lock, 
  User, 
  List, 
  Volume2, 
  VolumeX, 
  Flame, 
  Sparkles,
  BarChart2,
  HelpCircle,
  Trophy,
  Zap
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { sound } from './utils/sound';
import CookieCanvas from './components/CookieCanvas';
import type { CookieCanvasRef } from './components/CookieCanvas';

// API Base URL (loads from build environments in Netlify, falls back to localhost)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Upgrade Specifications
interface Upgrade {
  id: string;
  name: string;
  baseCost: number;
  cps: number;
  icon: string;
}

const UPGRADES: Upgrade[] = [
  { id: 'cursors', name: 'Cursor', baseCost: 15, cps: 0.1, icon: '🖱️' },
  { id: 'grandmas', name: 'Grandma', baseCost: 100, cps: 1.0, icon: '👵' },
  { id: 'farms', name: 'Farm', baseCost: 1100, cps: 8.0, icon: '🌾' },
  { id: 'mines', name: 'Mine', baseCost: 12000, cps: 47.0, icon: '⛏️' },
  { id: 'factories', name: 'Factory', baseCost: 130000, cps: 260.0, icon: '🏭' },
  { id: 'temples', name: 'Temple', baseCost: 1400000, cps: 1400.0, icon: '🕌' },
];

interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  check: (state: { totalBaked: number; clicks: number; cursorsCount: number; grandmasCount: number; farmsCount: number; goldenClicks: number }) => boolean;
}

const ACHIEVEMENTS_LIST: AchievementDef[] = [
  { id: 'bake_1', name: 'Wake and Bake', desc: 'Bake 1 cookie total.', icon: '🍳', check: s => s.totalBaked >= 1 },
  { id: 'bake_100', name: 'Clicker Cadet', desc: 'Bake 100 cookies total.', icon: '🥉', check: s => s.totalBaked >= 100 },
  { id: 'bake_10000', name: 'Cookie Tycoon', desc: 'Bake 10,000 cookies total.', icon: '🥈', check: s => s.totalBaked >= 10000 },
  { id: 'bake_1000000', name: 'Cookie Monarch', desc: 'Bake 1,000,000 cookies total.', icon: '👑', check: s => s.totalBaked >= 1000000 },
  { id: 'clicks_100', name: 'Finger Workout', desc: 'Click the big cookie 100 times.', icon: '⚡', check: s => s.clicks >= 100 },
  { id: 'cursors_10', name: 'Clicking Factory', desc: 'Own 10 Cursors.', icon: '🖱️', check: s => s.cursorsCount >= 10 },
  { id: 'grandmas_5', name: 'Retirement Home', desc: 'Own 5 Grandmas.', icon: '👵', check: s => s.grandmasCount >= 5 },
  { id: 'farms_3', name: 'Green Thumb', desc: 'Own 3 Farms.', icon: '🌾', check: s => s.farmsCount >= 3 },
  { id: 'golden_click', name: 'Golden Blessing', desc: 'Click a Golden Cookie.', icon: '🌟', check: s => s.goldenClicks >= 1 }
];

interface LeaderboardEntry {
  username: string;
  totalBaked: number;
  cookies: number;
  cps: number;
}

interface CpsHistoryPoint {
  time: string;
  cps: number;
}

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('cc_token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('cc_username'));
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'shop' | 'leaderboard' | 'analytics' | 'achievements'>('shop');

  // Game values
  const [cookies, setCookies] = useState<number>(0);
  const [clicks, setClicks] = useState<number>(0);
  const [totalBaked, setTotalBaked] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [goldenClicks, setGoldenClicks] = useState<number>(0);

  // Upgrades
  const [cursorsCount, setCursorsCount] = useState(0);
  const [grandmasCount, setGrandmasCount] = useState(0);
  const [farmsCount, setFarmsCount] = useState(0);
  const [minesCount, setMinesCount] = useState(0);
  const [factoriesCount, setFactoriesCount] = useState(0);
  const [templesCount, setTemplesCount] = useState(0);

  // Booster modifiers
  const [cursorsBoosted, setCursorsBoosted] = useState(false);
  const [grandmasBoosted, setGrandmasBoosted] = useState(false);
  const [farmsBoosted, setFarmsBoosted] = useState(false);

  // Achievements State
  const [achievements, setAchievements] = useState<string>(''); // comma-separated unlocked achievements
  const [activeToast, setActiveToast] = useState<{ name: string; desc: string; icon: string } | null>(null);

  // Visuals and Effects
  const [floatingTexts, setFloatingTexts] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const [goldenCookie, setGoldenCookie] = useState<{ x: number; y: number } | null>(null);
  const [frenzyType, setFrenzyType] = useState<'click' | 'production' | null>(null);
  const [frenzyTimeLeft, setFrenzyTimeLeft] = useState(0);

  // Stats & Sync
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [cpsHistory, setCpsHistory] = useState<CpsHistoryPoint[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  // Refs for tracking animation frames, timing, and crumb canvas physics
  const lastTickRef = useRef<number>(Date.now());
  const canvasRef = useRef<CookieCanvasRef>(null);

  const stateRef = useRef({
    cookies,
    clicks,
    totalBaked,
    cursorsCount,
    grandmasCount,
    farmsCount,
    minesCount,
    factoriesCount,
    templesCount,
    frenzyType,
    achievements,
    cursorsBoosted,
    grandmasBoosted,
    farmsBoosted
  });

  // Keep stateRef updated with fresh values
  useEffect(() => {
    stateRef.current = {
      cookies,
      clicks,
      totalBaked,
      cursorsCount,
      grandmasCount,
      farmsCount,
      minesCount,
      factoriesCount,
      templesCount,
      frenzyType,
      achievements,
      cursorsBoosted,
      grandmasBoosted,
      farmsBoosted
    };
  }, [cookies, clicks, totalBaked, cursorsCount, grandmasCount, farmsCount, minesCount, factoriesCount, templesCount, frenzyType, achievements, cursorsBoosted, grandmasBoosted, farmsBoosted]);

  // Get Upgrade counts mapping helper
  const getUpgradeCount = (id: string) => {
    switch (id) {
      case 'cursors': return cursorsCount;
      case 'grandmas': return grandmasCount;
      case 'farms': return farmsCount;
      case 'mines': return minesCount;
      case 'factories': return factoriesCount;
      case 'temples': return templesCount;
      default: return 0;
    }
  };

  // Set Upgrade counts mapping helper
  const incrementUpgradeCount = (id: string) => {
    switch (id) {
      case 'cursors': setCursorsCount(c => c + 1); break;
      case 'grandmas': setGrandmasCount(c => c + 1); break;
      case 'farms': setFarmsCount(c => c + 1); break;
      case 'mines': setMinesCount(c => c + 1); break;
      case 'factories': setFactoriesCount(c => c + 1); break;
      case 'temples': setTemplesCount(c => c + 1); break;
    }
  };

  // Calculate Upgrade Cost: cost = base * 1.15^count
  const getUpgradeCost = (upgrade: Upgrade) => {
    const count = getUpgradeCount(upgrade.id);
    return Math.floor(upgrade.baseCost * Math.pow(1.15, count));
  };

  // Helper to split achievement strings
  const getUnlockedList = () => {
    return achievements ? achievements.split(',') : [];
  };

  // Calculate CPS (Cookies Per Second)
  const calculateCps = () => {
    const rawCps = (cursorsCount * 0.1 * (cursorsBoosted ? 2.0 : 1.0)) +
                  (grandmasCount * 1.0 * (grandmasBoosted ? 2.0 : 1.0)) +
                  (farmsCount * 8.0 * (farmsBoosted ? 2.0 : 1.0)) +
                  (minesCount * 47.0) +
                  (factoriesCount * 260.0) +
                  (templesCount * 1400.0);
    
    // Achievements global multiplier: each achievement adds +1% global CPS
    const achievementMultiplier = 1.0 + (getUnlockedList().length * 0.01);
    const boostedCps = rawCps * achievementMultiplier;

    return frenzyType === 'production' ? boostedCps * 7.0 : boostedCps;
  };

  // Calculate Click Power
  const calculateClickPower = () => {
    // Reinforced index finger doubles clicking additions from cursors
    const basePower = 1 + (cursorsCount * 0.1 * (cursorsBoosted ? 2.0 : 1.0));
    return frenzyType === 'click' ? basePower * 777.0 : basePower;
  };

  // Achievements Trigger Check Loop
  useEffect(() => {
    const unlocked = getUnlockedList();
    const stateSnapshot = {
      totalBaked,
      clicks,
      cursorsCount,
      grandmasCount,
      farmsCount,
      goldenClicks
    };

    ACHIEVEMENTS_LIST.forEach(ach => {
      if (!unlocked.includes(ach.id) && ach.check(stateSnapshot)) {
        // Unlock Achievement
        const updated = achievements ? `${achievements},${ach.id}` : ach.id;
        setAchievements(updated);
        
        // Notification effects
        if (soundEnabled) sound.playAchievement();
        setActiveToast({ name: ach.name, desc: ach.desc, icon: ach.icon });

        // Hide notification toast after 4.5 seconds
        setTimeout(() => {
          setActiveToast(null);
        }, 4500);
      }
    });
  }, [totalBaked, clicks, cursorsCount, grandmasCount, farmsCount, goldenClicks, achievements, soundEnabled]);

  // Load game state
  useEffect(() => {
    if (token) {
      // Try to load from server
      fetch(`${API_BASE}/game/state`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.status === 401) {
          handleLogout();
          throw new Error('Unauthorized');
        }
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then(data => {
        setCookies(data.cookies);
        setClicks(data.clicks);
        setTotalBaked(data.totalBaked);
        setCursorsCount(data.cursorsCount);
        setGrandmasCount(data.grandmasCount);
        setFarmsCount(data.farmsCount);
        setMinesCount(data.minesCount);
        setFactoriesCount(data.factoriesCount);
        setTemplesCount(data.templesCount);
        setAchievements(data.achievements || '');
        setCursorsBoosted(data.cursorsBoosted || false);
        setGrandmasBoosted(data.grandmasBoosted || false);
        setFarmsBoosted(data.farmsBoosted || false);
        setIsOffline(false);
      })
      .catch(() => {
        // Fallback to local storage if offline
        loadLocalBackup();
        setIsOffline(true);
      });
    } else {
      loadLocalBackup();
    }
  }, [token]);

  const loadLocalBackup = () => {
    const localData = localStorage.getItem('cc_local_save');
    if (localData) {
      const data = JSON.parse(localData);
      setCookies(data.cookies || 0);
      setClicks(data.clicks || 0);
      setTotalBaked(data.totalBaked || 0);
      setCursorsCount(data.cursorsCount || 0);
      setGrandmasCount(data.grandmasCount || 0);
      setFarmsCount(data.farmsCount || 0);
      setMinesCount(data.minesCount || 0);
      setFactoriesCount(data.factoriesCount || 0);
      setTemplesCount(data.templesCount || 0);
      setAchievements(data.achievements || '');
      setCursorsBoosted(data.cursorsBoosted || false);
      setGrandmasBoosted(data.grandmasBoosted || false);
      setFarmsBoosted(data.farmsBoosted || false);
    }
  };

  // Save to local storage
  const saveToLocal = (currentState: any) => {
    localStorage.setItem('cc_local_save', JSON.stringify(currentState));
  };

  // Main Game Loop (Accumulating Cookies passive income)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTickRef.current) / 1000.0;
      lastTickRef.current = now;

      const currentCps = calculateCps();
      if (currentCps > 0) {
        const added = currentCps * delta;
        setCookies(c => c + added);
        setTotalBaked(t => t + added);
      }

      // Frenzy timing decrease
      if (frenzyType) {
        setFrenzyTimeLeft(t => {
          if (t <= delta) {
            setFrenzyType(null);
            return 0;
          }
          return t - delta;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [cursorsCount, grandmasCount, farmsCount, minesCount, factoriesCount, templesCount, frenzyType, cursorsBoosted, grandmasBoosted, farmsBoosted, achievements]);

  // Sync to Cloud Save every 10 seconds
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      const current = stateRef.current;
      const payload = {
        cookies: current.cookies,
        clicks: current.clicks,
        totalBaked: current.totalBaked,
        cursorsCount: current.cursorsCount,
        grandmasCount: current.grandmasCount,
        farmsCount: current.farmsCount,
        minesCount: current.minesCount,
        factoriesCount: current.factoriesCount,
        templesCount: current.templesCount,
        frenzyActive: current.frenzyType !== null,
        achievements: current.achievements,
        cursorsBoosted: current.cursorsBoosted,
        grandmasBoosted: current.grandmasBoosted,
        farmsBoosted: current.farmsBoosted
      };

      fetch(`${API_BASE}/game/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      .then(res => {
        if (!res.ok) throw new Error('Anti-cheat or Sync rejected');
        return res.json();
      })
      .then(() => {
        setIsOffline(false);
      })
      .catch((err) => {
        console.warn("Cloud sync failed. Operating in offline/safeguard mode.", err);
        setIsOffline(true);
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  // Periodic Leaderboard fetch
  useEffect(() => {
    const fetchLeaderboard = () => {
      fetch(`${API_BASE}/leaderboard`)
        .then(res => res.json())
        .then(data => setLeaderboard(data))
        .catch(() => console.warn("Failed to load leaderboard"));
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(interval);
  }, []);

  // Update CPS History Chart Data
  useEffect(() => {
    const interval = setInterval(() => {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setCpsHistory(h => {
        const next = [...h, { time: nowStr, cps: calculateCps() }];
        return next.slice(-15); // limit to 15 points
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [cursorsCount, grandmasCount, farmsCount, minesCount, factoriesCount, templesCount, frenzyType, cursorsBoosted, grandmasBoosted, farmsBoosted, achievements]);

  // Golden Cookie Spawner
  useEffect(() => {
    const spawnTimer = setInterval(() => {
      if (Math.random() < 0.35 && !goldenCookie) {
        // Spawn inside 10%-80% coordinates
        const x = 10 + Math.random() * 70;
        const y = 20 + Math.random() * 60;
        setGoldenCookie({ x, y });

        // despawn golden cookie after 12 seconds
        setTimeout(() => {
          setGoldenCookie(null);
        }, 12000);
      }
    }, 30000);

    return () => clearInterval(spawnTimer);
  }, [goldenCookie]);

  // Save local state on change
  useEffect(() => {
    saveToLocal({
      cookies,
      clicks,
      totalBaked,
      cursorsCount,
      grandmasCount,
      farmsCount,
      minesCount,
      factoriesCount,
      templesCount,
      achievements,
      cursorsBoosted,
      grandmasBoosted,
      farmsBoosted
    });
  }, [cookies, clicks, totalBaked, cursorsCount, grandmasCount, farmsCount, minesCount, factoriesCount, templesCount, achievements, cursorsBoosted, grandmasBoosted, farmsBoosted]);

  // Handlers
  const handleCookieClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (soundEnabled) sound.playClick();

    const power = calculateClickPower();
    setCookies(c => c + power);
    setTotalBaked(t => t + power);
    setClicks(cl => cl + 1);

    // Floating text coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nextId = Date.now() + Math.random();

    setFloatingTexts(prev => [
      ...prev,
      { id: nextId, x, y, text: `+${power.toFixed(1)}` }
    ]);

    // Trigger Canvas Crumb explosion physics
    canvasRef.current?.spawnCrumbs(x, y);

    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== nextId));
    }, 800);
  };

  const handleBuyUpgrade = (upgrade: Upgrade) => {
    const cost = getUpgradeCost(upgrade);
    if (cookies >= cost) {
      setCookies(c => c - cost);
      incrementUpgradeCount(upgrade.id);
      if (soundEnabled) sound.playUpgrade();
    } else {
      if (soundEnabled) sound.playError();
    }
  };

  const handleBuyBooster = (type: 'cursors' | 'grandmas' | 'farms', cost: number) => {
    if (cookies >= cost) {
      setCookies(c => c - cost);
      if (type === 'cursors') setCursorsBoosted(true);
      if (type === 'grandmas') setGrandmasBoosted(true);
      if (type === 'farms') setFarmsBoosted(true);
      if (soundEnabled) sound.playUpgrade();
    } else {
      if (soundEnabled) sound.playError();
    }
  };

  const handleGoldenCookieClick = () => {
    setGoldenCookie(null);
    setGoldenClicks(c => c + 1);
    if (soundEnabled) sound.playGoldenCookie();

    const isClickFrenzy = Math.random() > 0.5;
    if (isClickFrenzy) {
      setFrenzyType('click');
      setFrenzyTimeLeft(13); // 13s click frenzy
    } else {
      setFrenzyType('production');
      setFrenzyTimeLeft(77); // 77s production frenzy
    }
  };

  // Auth Operations
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const endpoint = authMode === 'login' ? 'login' : 'register';
    fetch(`${API_BASE}/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: authUsername, password: authPassword })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }
      return data;
    })
    .then(data => {
      localStorage.setItem('cc_token', data.token);
      localStorage.setItem('cc_username', data.username);
      setToken(data.token);
      setUsername(data.username);
      setAuthUsername('');
      setAuthPassword('');
    })
    .catch(err => {
      setAuthError(err.message);
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_username');
    setToken(null);
    setUsername(null);
    setLeaderboard([]);
  };

  // Guest Bypass
  const playAsGuest = () => {
    setUsername('Guest');
    setToken(null);
  };

  if (!username) {
    return (
      <div className="auth-container">
        <div className="bg-overlay"></div>
        <div className="auth-card" style={{ position: 'relative' }}>
          {/* Info/Help Trigger Icon */}
          <button 
            className="tab-btn" 
            style={{ 
              position: 'absolute', 
              top: '15px', 
              right: '15px', 
              width: '36px', 
              height: '36px', 
              padding: 0, 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--panel-border)',
              background: 'rgba(255,255,255,0.03)'
            }}
            onClick={() => setShowAboutModal(true)}
            type="button"
            title="About this game"
          >
            <HelpCircle size={20} color="var(--color-primary)" />
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <Cookie size={60} color="#a855f7" className="cookie-svg" style={{ animation: 'spin 15s linear infinite' }} />
          </div>
          <h1 className="auth-title">Cookie Clicker</h1>
          <p className="auth-subtitle">Enterprise Edition Game Portal</p>

          {/* Info Modal Overlay */}
          {showAboutModal && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(5, 4, 10, 0.85)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
              }}
            >
              <div 
                className="auth-card" 
                style={{ 
                  width: '520px', 
                  background: 'rgba(20, 18, 36, 0.95)',
                  border: '1px solid var(--panel-border-hover)',
                  position: 'relative'
                }}
              >
                <h2 className="auth-title" style={{ fontSize: '24px', marginBottom: '15px', textAlign: 'center' }}>
                  Enterprise Edition Details
                </h2>
                
                <div style={{ 
                  fontSize: '14px', 
                  lineHeight: '1.6', 
                  color: 'var(--text-secondary)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '14px', 
                  maxHeight: '380px', 
                  overflowY: 'auto', 
                  paddingRight: '8px', 
                  marginBottom: '20px',
                  textAlign: 'left'
                }}>
                  <p>
                    Welcome to <strong>Cookie Clicker: Enterprise Edition</strong>, a spectacular, secure full-stack recreation of the classic incremental clicker game.
                  </p>
                  <div>
                    <h4 style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>🛡️ Server-Side Anti-Cheat Shield</h4>
                    <p style={{ marginTop: '2px' }}>
                      Unlike client-only games where cookies can be injected instantly, every user save is validated by a Spring Boot backend. The system tracks clicks, upgrades, and CPS timeline to reject mathematical anomalies or cheat-clicking software.
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>☁️ Real-time Cloud Synchronization</h4>
                    <p style={{ marginTop: '2px' }}>
                      Sign up or log in to sync your local save data to our H2 cloud database automatically. Play on any web browser or use our modernized Java Swing desktop client to automatically continue your progress.
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>📊 Live Analytics & Ranks</h4>
                    <p style={{ marginTop: '2px' }}>
                      Track your performance timeline with SVG graphs using Recharts. Compete against global players on the real-time leaderboard showing rankings and total baked stats.
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>🎵 Web Audio Synthesis</h4>
                    <p style={{ marginTop: '2px' }}>
                      Sound effects (clicks, upgrades, achievements, and golden sparkles) are programmatically generated by custom JavaScript oscillators (Web Audio API) for zero network latency or image/media dependencies.
                    </p>
                  </div>
                </div>

                <button 
                  className="btn-primary" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAboutModal(false);
                  }}
                  type="button"
                >
                  Got it, Let's Play!
                </button>
              </div>
            </div>
          )}

          {authError && <div className="auth-error">{authError}</div>}

          <form onSubmit={handleAuthSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Enter username" 
                required 
                value={authUsername}
                onChange={e => setAuthUsername(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Enter password" 
                required
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
              <Lock size={16} />
              {authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div style={{ marginTop: '15px' }}>
            <button className="tab-btn" style={{ width: '100%', border: '1px solid rgba(255,255,255,0.1)' }} onClick={playAsGuest}>
              Play Offline as Guest
            </button>
          </div>

          <div className="auth-toggle">
            {authMode === 'login' ? (
              <span>New to the game? <span className="auth-toggle-link" onClick={() => setAuthMode('register')}>Create Account</span></span>
            ) : (
              <span>Already have an account? <span className="auth-toggle-link" onClick={() => setAuthMode('login')}>Sign In</span></span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="bg-overlay"></div>

      {/* LEFT PANEL: Statistics and Control */}
      <div className="glass-panel">
        <div className="user-bar">
          <div className="user-info">
            <User size={16} color="#c084fc" />
            <span>{username}</span>
            {isOffline && <span className="offline-badge">Offline</span>}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            Exit
          </button>
        </div>

        <div className="panel-content">
          <div className="stats-header">
            <Award size={20} color="#eab308" />
            <span>Overview Stats</span>
          </div>

          <div className="stat-card">
            <div className="stat-label">Production Speed</div>
            <div className="stat-value stat-primary">{calculateCps().toFixed(1)} CPS</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Cookie Value / Click</div>
            <div className="stat-value stat-accent">+{calculateClickPower().toFixed(1)}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Lifetime Clicks</div>
            <div className="stat-value">{clicks.toLocaleString()}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Baked Cookies</div>
            <div className="stat-value">{Math.floor(totalBaked).toLocaleString()}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <button 
              className="tab-btn" 
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{ border: '1px solid var(--panel-border)', flex: 'none', width: '60px', height: '40px' }}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* CENTRAL AREA: The Cookie clicker button */}
      <div className="cookie-section">
        {frenzyType && (
          <div className="frenzy-banner">
            <Flame size={16} style={{ display: 'inline', marginRight: '6px' }} />
            {frenzyType === 'click' ? '777x CLICK FRENZY ACTIVE!' : '7x PRODUCTION FRENZY ACTIVE!'}
            <div style={{ fontSize: '11px', fontWeight: 'normal' }}>{frenzyTimeLeft.toFixed(1)}s remaining</div>
          </div>
        )}

        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)' }}>COOKIE BALANCE</h2>
          <h1 style={{ fontSize: '48px', fontWeight: 800, marginTop: '5px', letterSpacing: '-0.02em' }}>
            {Math.floor(cookies).toLocaleString()}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            cookies
          </p>
        </div>

        <div className="cookie-container">
          <div className="cookie-glow"></div>
          {/* Crumbs bursting physics canvas */}
          <CookieCanvas ref={canvasRef} />
          
          <button className="cookie-btn" onClick={handleCookieClick}>
            {/* BIG SVG COOKIE */}
            <svg 
              viewBox="0 0 512 512" 
              className={`cookie-svg ${frenzyType ? 'spinning-frenzy' : ''}`}
            >
              {/* Main cookie body */}
              <circle cx="256" cy="256" r="230" fill="#c68a4c" stroke="#5c3f15" strokeWidth="12" />
              {/* Shadow details */}
              <path d="M70 256 C 70 358, 154 442, 256 442 C 358 442, 442 358, 442 256 C 442 220, 420 180, 390 140 C 350 90, 300 75, 256 70 C 154 70, 70 154, 70 256 Z" fill="#b57d42" opacity="0.3" />
              {/* Chocolate chips */}
              <circle cx="150" cy="180" r="24" fill="#3d2205" />
              <circle cx="280" cy="150" r="28" fill="#3d2205" />
              <circle cx="370" cy="200" r="26" fill="#3d2205" />
              <circle cx="180" cy="330" r="28" fill="#3d2205" />
              <circle cx="300" cy="350" r="24" fill="#3d2205" />
              <circle cx="260" cy="260" r="30" fill="#3d2205" />
              <circle cx="380" cy="310" r="20" fill="#3d2205" />
              <circle cx="130" cy="260" r="22" fill="#3d2205" />
            </svg>

            {/* Click flyouts */}
            {floatingTexts.map(f => (
              <span 
                key={f.id} 
                className="floating-click" 
                style={{ left: f.x, top: f.y }}
              >
                {f.text}
              </span>
            ))}
          </button>
        </div>

        {/* Floating Golden Cookie */}
        {goldenCookie && (
          <div 
            className="golden-cookie" 
            style={{ left: `${goldenCookie.x}%`, top: `${goldenCookie.y}%` }}
            onClick={handleGoldenCookieClick}
          >
            <svg viewBox="0 0 512 512" style={{ width: '100%', height: '100%' }}>
              <circle cx="256" cy="256" r="230" fill="#eab308" stroke="#a16207" strokeWidth="12" />
              <circle cx="150" cy="180" r="24" fill="#a16207" />
              <circle cx="280" cy="150" r="28" fill="#a16207" />
              <circle cx="370" cy="200" r="26" fill="#a16207" />
              <circle cx="180" cy="330" r="28" fill="#a16207" />
              <circle cx="300" cy="350" r="24" fill="#a16207" />
              <circle cx="260" cy="260" r="30" fill="#a16207" />
            </svg>
          </div>
        )}

        <div style={{ marginTop: '20px', display: 'flex', gap: '8px', zIndex: 10 }}>
          <span className="offline-badge" style={{ background: frenzyType ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.05)', color: frenzyType ? 'var(--color-accent)' : 'var(--text-secondary)', border: 'none' }}>
            {frenzyType ? 'BOOST ACTIVE' : 'STEADY SECURE STATE'}
          </span>
        </div>
      </div>

      {/* RIGHT PANEL: Store, Leaderboard, Achievements or Analytics Tab */}
      <div className="glass-panel right">
        <div className="tab-header" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <button 
            className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`}
            onClick={() => setActiveTab('shop')}
          >
            <Sparkles size={14} />
            Shop
          </button>
          <button 
            className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`}
            onClick={() => setActiveTab('achievements')}
          >
            <Trophy size={14} />
            Awards
          </button>
          <button 
            className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            <List size={14} />
            Ranks
          </button>
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart2 size={14} />
            Analytics
          </button>
        </div>

        <div className="panel-content">
          {/* TAB 1: UPGRADES SHOP */}
          {activeTab === 'shop' && (
            <div>
              {/* Boosters Subsection */}
              <div className="stats-header" style={{ marginBottom: '10px', fontSize: '15px' }}>
                <Zap size={16} color="var(--color-accent)" />
                <span>One-Time Modifiers</span>
              </div>
              <div style={{ marginBottom: '20px' }}>
                {/* Reinforced Index Finger */}
                <div 
                  className={`upgrade-item ${cursorsBoosted ? 'disabled' : (cookies >= 150 ? '' : 'disabled')}`}
                  onClick={() => !cursorsBoosted && handleBuyBooster('cursors', 150)}
                >
                  <div className="upgrade-icon">⚡</div>
                  <div className="upgrade-info">
                    <div className="upgrade-name">
                      <span>Index Finger Upgrade</span>
                      {cursorsBoosted && <span className="upgrade-count">Max</span>}
                    </div>
                    <div className="upgrade-stats">
                      <span className="upgrade-cost Affordable">🪙 150</span>
                      <span>Doubles Cursor CPS & click</span>
                    </div>
                  </div>
                </div>

                {/* Forwards from Grandma */}
                <div 
                  className={`upgrade-item ${grandmasBoosted ? 'disabled' : (cookies >= 1000 ? '' : 'disabled')}`}
                  onClick={() => !grandmasBoosted && handleBuyBooster('grandmas', 1000)}
                >
                  <div className="upgrade-icon">👵💬</div>
                  <div className="upgrade-info">
                    <div className="upgrade-name">
                      <span>Email from Grandma</span>
                      {grandmasBoosted && <span className="upgrade-count">Max</span>}
                    </div>
                    <div className="upgrade-stats">
                      <span className="upgrade-cost Affordable">🪙 1,000</span>
                      <span>Doubles Grandma CPS</span>
                    </div>
                  </div>
                </div>

                {/* Fertilizer */}
                <div 
                  className={`upgrade-item ${farmsBoosted ? 'disabled' : (cookies >= 11000 ? '' : 'disabled')}`}
                  onClick={() => !farmsBoosted && handleBuyBooster('farms', 11000)}
                >
                  <div className="upgrade-icon">🧪</div>
                  <div className="upgrade-info">
                    <div className="upgrade-name">
                      <span>Super Fertilizer</span>
                      {farmsBoosted && <span className="upgrade-count">Max</span>}
                    </div>
                    <div className="upgrade-stats">
                      <span className="upgrade-cost Affordable">🪙 11,000</span>
                      <span>Doubles Farm CPS</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Standard Buildings Section */}
              <div className="stats-header" style={{ marginBottom: '15px' }}>
                <Sparkles size={18} color="var(--color-primary)" />
                <span>Asset Upgrades</span>
              </div>

              {UPGRADES.map(upgrade => {
                const cost = getUpgradeCost(upgrade);
                const count = getUpgradeCount(upgrade.id);
                const affordable = cookies >= cost;

                return (
                  <div 
                    key={upgrade.id} 
                    className={`upgrade-item ${affordable ? '' : 'disabled'}`}
                    onClick={() => handleBuyUpgrade(upgrade)}
                  >
                    <div className="upgrade-icon">
                      <span style={{ fontSize: '24px' }}>{upgrade.icon}</span>
                    </div>
                    <div className="upgrade-info">
                      <div className="upgrade-name">
                        <span>{upgrade.name}</span>
                        {count > 0 && <span className="upgrade-count">x{count}</span>}
                      </div>
                      <div className="upgrade-stats">
                        <span className={`upgrade-cost ${affordable ? 'affordable' : ''}`}>
                          🪙 {cost.toLocaleString()}
                        </span>
                        <span>+{upgrade.cps} CPS</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: ACHIEVEMENTS AWARDS */}
          {activeTab === 'achievements' && (
            <div>
              <div className="stats-header" style={{ marginBottom: '15px' }}>
                <Trophy size={18} color="var(--color-accent)" />
                <span>Unlocked Awards ({getUnlockedList().length} / {ACHIEVEMENTS_LIST.length})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {ACHIEVEMENTS_LIST.map(ach => {
                  const unlocked = getUnlockedList().includes(ach.id);
                  return (
                    <div 
                      key={ach.id} 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: unlocked ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.01)',
                        border: '1px solid',
                        borderColor: unlocked ? 'rgba(168,85,247,0.25)' : 'var(--panel-border)',
                        padding: '12px',
                        borderRadius: '12px',
                        opacity: unlocked ? 1 : 0.4
                      }}
                    >
                      <div style={{ fontSize: '28px', marginRight: '14px' }}>{ach.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: unlocked ? '#fff' : 'var(--text-secondary)' }}>
                          {ach.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {ach.desc}
                        </div>
                      </div>
                      {unlocked && (
                        <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 'bold' }}>
                          +1% CPS
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div>
              <div className="stats-header" style={{ marginBottom: '15px' }}>
                <TrendingUp size={18} color="var(--color-accent)" />
                <span>Global Rankings</span>
              </div>

              {leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                  No active rankings. Connect to network to view.
                </div>
              ) : (
                <div className="leaderboard-list">
                  {leaderboard.map((entry, idx) => (
                    <div 
                      key={entry.username} 
                      className={`leaderboard-item ${entry.username === username ? 'self' : ''}`}
                    >
                      <div className={`leaderboard-rank top-${idx + 1}`}>
                        #{idx + 1}
                      </div>
                      <div className="leaderboard-details">
                        <span className="leaderboard-name">{entry.username}</span>
                        <span className="leaderboard-score">
                          {Math.floor(entry.totalBaked).toLocaleString()} baked
                        </span>
                      </div>
                      <div className="leaderboard-cps">
                        {entry.cps.toFixed(1)} CPS
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: STATS CHARTS & GRAPHS */}
          {activeTab === 'analytics' && (
            <div>
              <div className="stats-header" style={{ marginBottom: '15px' }}>
                <TrendingUp size={18} color="var(--color-primary)" />
                <span>Baking Performance</span>
              </div>

              <div className="stat-card">
                <div className="stat-label" style={{ marginBottom: '10px' }}>CPS Performance History</div>
                {cpsHistory.length < 2 ? (
                  <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifySelf: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    Gathering baking timeline points...
                  </div>
                ) : (
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cpsHistory}>
                        <defs>
                          <linearGradient id="cpsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#121020', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                        <Area type="monotone" dataKey="cps" stroke="var(--color-primary)" fillOpacity={1} fill="url(#cpsGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="stat-card" style={{ marginTop: '20px' }}>
                <div className="stat-label">Upgrade Value Weights</div>
                <div style={{ fontSize: '14px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cursors (Boosted: {cursorsBoosted ? 'Yes' : 'No'}):</span>
                    <span style={{ fontWeight: 'bold' }}>{(cursorsCount * 0.1 * (cursorsBoosted ? 2 : 1)).toFixed(1)} CPS</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Grandmas (Boosted: {grandmasBoosted ? 'Yes' : 'No'}):</span>
                    <span style={{ fontWeight: 'bold' }}>{(grandmasCount * 1.0 * (grandmasBoosted ? 2 : 1)).toFixed(1)} CPS</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Farms (Boosted: {farmsBoosted ? 'Yes' : 'No'}):</span>
                    <span style={{ fontWeight: 'bold' }}>{(farmsCount * 8.0 * (farmsBoosted ? 2 : 1)).toFixed(1)} CPS</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Mines/Factories/Temples CPS:</span>
                    <span style={{ fontWeight: 'bold' }}>
                      {((minesCount * 47.0) + (factoriesCount * 260.0) + (templesCount * 1400.0)).toFixed(1)} CPS
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Achievements unlock Toast Popup */}
      {activeToast && (
        <div 
          style={{
            position: 'fixed',
            bottom: '25px',
            right: '25px',
            background: 'rgba(20, 18, 36, 0.95)',
            border: '2px solid var(--color-accent)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(234,179,8,0.2)',
            zIndex: 99999,
            maxWidth: '350px',
            animation: 'alertPulse 0.5s ease-out'
          }}
        >
          <div style={{ fontSize: '32px' }}>{activeToast.icon}</div>
          <div>
            <div style={{ color: 'var(--color-accent)', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Achievement Unlocked!
            </div>
            <div style={{ fontWeight: 800, color: '#fff', fontSize: '15px', marginTop: '2px' }}>
              {activeToast.name}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
              {activeToast.desc} (+1% Global CPS)
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
