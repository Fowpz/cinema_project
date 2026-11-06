import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Poster from '../src/components/Poster';
import { api } from '../src/services/api';
import { parseGenres, toDateId } from '../src/utils/format';
const DAY_LABELS = ['Сегодня', 'Завтра'];
const WEEKDAYS = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];
const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];
function buildDates() {
  const dates = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const id = toDateId(date);
    const label = DAY_LABELS[i] ?? WEEKDAYS[date.getDay()];
    const subtitle = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
    dates.push({ id, label, subtitle });
  }
  return dates;
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width > 700;
  const [dates] = useState(buildDates);
  const [selectedDate, setSelectedDate] = useState(dates[0].id);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api
      .getSchedule(selectedDate)
      .then((data) => {
        if (!cancelled) setMovies(data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message || 'Не удалось загрузить афишу');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>Кинотеатр</Text>
        <Pressable
          style={styles.profileButton}
          onPress={() => router.push('/profile')}
        >
          <Text style={styles.profileButtonText}>Личный кабинет</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.datesBar}
        contentContainerStyle={styles.datesContent}
      >
        {dates.map((dateOption) => {
          const isSelected = dateOption.id === selectedDate;
          return (
            <Pressable
              key={dateOption.id}
              style={[styles.dateItem, isSelected && styles.dateItemActive]}
              onPress={() => {
                if (isSelected) return;
                setLoading(true);
                setError(null);
                setSelectedDate(dateOption.id);
              }}
            >
              <Text
                style={[styles.dateLabel, isSelected && styles.dateLabelActive]}
              >
                {dateOption.label}
              </Text>
              <Text
                style={[styles.dateSub, isSelected && styles.dateSubActive]}
              >
                {dateOption.subtitle}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scheduleScroll}
        contentContainerStyle={styles.content}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#4fc3f7" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            {movies.length === 0 && (
              <Text style={styles.noSessions}>Нет сеансов на эту дату</Text>
            )}

            {movies.map((movie) => {
              const tags = parseGenres(movie.genres);
              const availableHalls = movie.hallsShowtimes.filter(
                (hall) => hall.showtimes.length > 0,
              );
              const posterWidth = isWide ? 140 : 96;
              const openMovie = () =>
                router.push({ pathname: '/movie', params: { id: movie.id } });

              const halls =
                availableHalls.length === 0 ? (
                  <Text style={styles.noSessions}>
                    {selectedDate === dates[0].id
                      ? 'На сегодня сеансов больше нет'
                      : 'Нет сеансов на эту дату'}
                  </Text>
                ) : (
                  availableHalls.map((hallSchedule) => (
                    <View key={hallSchedule.hall} style={styles.hallLine}>
                      <Text style={styles.hallLabel}>{hallSchedule.hall}</Text>
                      <View style={styles.timesRow}>
                        {hallSchedule.showtimes.map((showtime) => (
                          <Pressable
                            key={showtime.id}
                            style={styles.timeChip}
                            onPress={() =>
                              router.push({
                                pathname: '/seats',
                                params: { id: showtime.id },
                              })
                            }
                          >
                            <Text style={styles.timeText}>{showtime.time}</Text>
                            <Text style={styles.priceText}>
                              от {showtime.price} ₽
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ))
                );

              return (
                <View key={movie.id} style={styles.movieRow}>
                  <View style={styles.topRow}>
                    <Pressable onPress={openMovie}>
                      <Poster
                        uri={movie.posterUrl}
                        title={movie.title}
                        movieId={movie.id}
                        width={posterWidth}
                      />
                    </Pressable>

                    <View style={styles.info}>
                      <Pressable onPress={openMovie}>
                        <Text style={styles.movieTitle}>
                          {movie.title}{' '}
                          <Text style={styles.ageInline}>
                            {movie.ageRating}
                          </Text>
                        </Text>
                      </Pressable>

                      <View style={styles.tags}>
                        {tags.map((tag) => (
                          <View key={tag} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>

                      {isWide && <View>{halls}</View>}
                    </View>
                  </View>

                  {!isWide && <View style={styles.hallsBlock}>{halls}</View>}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8fc',
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dce6f1',
  },
  brand: { color: '#17324d', fontSize: 20, fontWeight: '800' },
  profileButton: {
    backgroundColor: '#e8f4fc',
    borderWidth: 1,
    borderColor: '#b8d9ed',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  profileButtonText: { color: '#4fc3f7', fontSize: 13, fontWeight: '700' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
  },
  datesBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dce6f1',
    maxHeight: 70,
  },
  scheduleScroll: {
    flex: 1,
  },
  datesContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dateItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    minWidth: 90,
  },
  dateItemActive: {
    backgroundColor: '#e3f2fd',
  },
  dateLabel: {
    color: '#587087',
    fontSize: 14,
    fontWeight: '600',
  },
  dateLabelActive: {
    color: '#4fc3f7',
  },
  dateSub: {
    color: '#8294a6',
    fontSize: 11,
    marginTop: 2,
  },
  dateSubActive: {
    color: '#3b85ad',
  },
  content: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  movieRow: {
    marginBottom: 20,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dce6f1',
    shadowColor: '#90a8bd',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  hallsBlock: {
    marginTop: 14,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  movieTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#17324d',
    marginBottom: 8,
  },
  ageInline: {
    fontSize: 14,
    color: '#4fc3f7',
    fontWeight: '500',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  tag: {
    backgroundColor: '#f3f7fa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d9e4ec',
  },
  tagText: {
    color: '#62788d',
    fontSize: 12,
  },
  hallLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  hallLabel: {
    color: '#61758a',
    fontSize: 13,
    width: 48,
    marginRight: 8,
    paddingTop: 10,
  },
  timesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  timeChip: {
    backgroundColor: '#edf6fc',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#c8e1f0',
    minWidth: 72,
    alignItems: 'center',
  },
  timeText: {
    color: '#4fc3f7',
    fontWeight: '700',
    fontSize: 15,
  },
  priceText: {
    color: '#61758a',
    fontSize: 11,
    marginTop: 2,
  },
  noSessions: {
    color: '#61758a',
    fontSize: 14,
    padding: 16,
  },
});
