import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Animated,
  Easing,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const API_KEY = 'f88e755f398a8552e99e3c9d0d21cfd9';

export default function App() {
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // NEW: Pulse animation refs
  const cardPulse = useRef(new Animated.Value(1)).current;
  const tempPulse = useRef(new Animated.Value(1)).current;

  let typingTimeout = useRef(null);

  useEffect(() => {
    if (weather) {
      // Fade + scale on appear
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();

      // Start continuous pulse animations
      startPulse(cardPulse, 1.02, 800);
      startPulse(tempPulse, 1.1, 600);
    }
  }, [weather]);

  const startPulse = (animRef, scaleTo, duration) => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animRef, {
          toValue: scaleTo,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(animRef, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const fetchWeatherByCity = async (cityName = city) => {
    if (!cityName.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    setErrorMsg('');
    setSuggestions([]);
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        cityName.trim(),
      )}&units=metric&appid=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.cod === 200) {
        setWeather(data);
      } else {
        setWeather(null);
        setErrorMsg(data?.message || 'City not found');
      }
    } catch {
      setWeather(null);
      setErrorMsg('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCitySuggestions = async query => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
        query.trim(),
      )}&limit=5&appid=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleCityChange = text => {
    setCity(text);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      fetchCitySuggestions(text);
    }, 500);
  };

  const reset = () => {
    setWeather(null);
    setErrorMsg('');
    setCity('');
    setSuggestions([]);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.95);
    cardPulse.setValue(1);
    tempPulse.setValue(1);
  };

  return (
    <LinearGradient colors={['#6a11cb', '#2575fc']} style={styles.container}>
      <Text style={styles.title}>🌤 AeroWeather</Text>

      <View style={styles.row}>
        <TextInput
          placeholder="Enter city..."
          placeholderTextColor="#ddd"
          value={city}
          onChangeText={handleCityChange}
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={() => fetchWeatherByCity(city)}
        />
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => fetchWeatherByCity(city)}
        >
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {loadingSuggestions && <ActivityIndicator size="small" color="#fff" />}

      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item, index) => index.toString()}
          style={styles.suggestionsBox}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => {
                setCity(item.name);
                fetchWeatherByCity(item.name);
              }}
            >
              <Text style={styles.suggestionText}>
                📍 {item.name}, {item.state ? item.state + ', ' : ''}
                {item.country}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {loading && (
        <ActivityIndicator
          size="large"
          color="#fff"
          style={{ marginTop: 20 }}
        />
      )}

      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

      {weather && (
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { scale: cardPulse }],
            },
          ]}
        >
          <Text style={styles.city}>
            📍 {weather.name}, {weather.sys?.country}
          </Text>

          {/* Temperature with pulse */}
          <Animated.Text
            style={[styles.temp, { transform: [{ scale: tempPulse }] }]}
          >
            {Math.round(weather.main?.temp)}°C
          </Animated.Text>

          <Text style={styles.desc}>
            {weather.weather?.[0]?.description}{' '}
            {getEmoji(weather.weather?.[0]?.main)}
          </Text>

          <View style={styles.details}>
            <Text style={styles.detailText}>
              💧 Humidity: {weather.main?.humidity}%
            </Text>
            <Text style={styles.detailText}>
              🌬 Wind: {weather.wind?.speed} m/s
            </Text>
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={reset}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Clear</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

function getEmoji(main) {
  if (!main) return '🌤';
  switch (main) {
    case 'Clouds':
      return '☁️';
    case 'Clear':
      return '☀️';
    case 'Rain':
      return '🌧️';
    case 'Snow':
      return '❄️';
    case 'Thunderstorm':
      return '⛈️';
    default:
      return '🌤';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 25,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    color: '#fff',
  },
  searchBtn: {
    marginLeft: 8,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
  },
  searchBtnText: { fontSize: 18 },
  suggestionsBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    marginTop: 5,
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 10,
    borderBottomColor: '#ddd',
    borderBottomWidth: 0.3,
  },
  suggestionText: { color: '#fff', fontSize: 16 },
  card: {
    marginTop: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  city: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 6 },
  temp: { fontSize: 54, fontWeight: '700', color: '#fff' },
  desc: {
    fontSize: 18,
    marginTop: 6,
    color: '#fff',
    textTransform: 'capitalize',
  },
  details: { marginTop: 10, alignItems: 'center', gap: 5 },
  detailText: { color: '#fff' },
  resetBtn: {
    marginTop: 14,
    backgroundColor: '#ff4b2b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  error: {
    marginTop: 12,
    color: 'yellow',
    fontWeight: '600',
    textAlign: 'center',
  },
});
