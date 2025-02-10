import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import axios from "axios";
import styles from "../styles/Home.module.css";

// Reciters mapping for the dropdown
const recitersMapping = {
  "عبدالباسط عبدالصمد": { name: "AbdulBaset", apiId: 1, useApi1: true },
  "محمد صديق المنشاوي": { name: "Minshawi", apiId: 7, useApi1: true },
  "عبدالرحمن السديس": { name: "Sudais", apiId: 3, useApi1: false },
  "سعود الشريم": { name: "Shuraym", apiId: 4, useApi1: false },
  "ناصر القطامي": { name: "NasserAlQatami", apiId: 5, useApi1: false },
  "محمود خليل الحصري": { name: "Husary", apiId: 6, useApi1: false },
  "عبدالله السبيعي": { name: "Sibai", apiId: 10, useApi1: false },
  "عبدالملك الحمدي": { name: "Hamdiy", apiId: 11, useApi1: false },
  "محمد الطبلاوي": { name: "alTablawi", apiId: 12, useApi1: false },
  "مشاري العفاسي": { name: "Alafasy", apiId: 8, useApi1: true },
  "سعد الغامدي": { name: "SaadAlGhamdi", apiId: 15, useApi1: false },
};

// Mushaf types for the dropdown
const mushafTypes = [
  "images1",
  "images2",
  "images3",
  "images4",
  "images5",
  "images6",
  "images7",
  "images8",
  "images9",
  "images10",
  "images11",
];

// Function to get Quran page image URL
const getQuranPageImage = (pageNumber, mushafType) => {
  return `https://www.searchtruth.com/quran/images/${mushafType}/${String(
    pageNumber
  ).padStart(3, "0")}.jpg`;
};

// Function to format time
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${secs}`;
}

export default function Home() {
  const [reciter, setReciter] = useState("عبدالباسط عبدالصمد");
  const [surah, setSurah] = useState(1);
  const [ayahStart, setAyahStart] = useState(1);
  const [ayahEnd, setAyahEnd] = useState(7); // Default to last ayah of Surah Al-Fatiha
  const [audioUrls, setAudioUrls] = useState([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [durations, setDurations] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recitedAyahText, setRecitedAyahText] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [surahs, setSurahs] = useState([]);
  const [ayahs, setAyahs] = useState([]);
  const [mushafType, setMushafType] = useState("images1");

  const audioRef = useRef(null);

  // Fetch surahs on component mount
  useEffect(() => {
    axios
      .get("./surahs.json")
      .then((res) => {
        setSurahs(res.data);
      })
      .catch((error) => {
        console.error("Error fetching surahs:", error);
      });
  }, []);

  // Fetch ayahs for the selected surah
  useEffect(() => {
    if (surah) {
      setLoading(true);
      axios
        .get(`https://api.alquran.cloud/v1/surah/${surah}/ar`)
        .then((res) => {
          if (res.data.data.ayahs) {
            setAyahs(res.data.data.ayahs);
            setAyahStart(1); // Reset ayahStart to 1
            setAyahEnd(res.data.data.ayahs.length); // Set ayahEnd to last ayah
            setCurrentAudioIndex(0); // Reset audio index
            setAudioUrls([]); // Clear audio URLs
            setDurations([]); // Clear durations
            setCurrentTime(0); // Reset current time
            setTotalDuration(0); // Reset total duration
            setIsPlaying(false); // Stop playback
          }
        })
        .catch((error) => {
          console.error("Error fetching ayahs:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [surah]);

  // Ensure ayahEnd is always greater than or equal to ayahStart
  useEffect(() => {
    if (ayahEnd < ayahStart) {
      setAyahEnd(ayahStart);
    }
  }, [ayahStart]);

  // Ensure ayahStart is always less than or equal to ayahEnd
  useEffect(() => {
    if (ayahStart > ayahEnd) {
      setAyahStart(ayahEnd);
    }
  }, [ayahEnd]);

  // Fetch audio URLs
  const fetchAudio = async () => {
    setLoading(true);
    setAudioUrls([]);
    setCurrentAudioIndex(0);
    setDurations([]);
    setCurrentTime(0);
    setTotalDuration(0);
    setIsPlaying(false);
    try {
      const response = await axios.get(
        `/api/audio?reciter=${encodeURIComponent(
          reciter
        )}&surah=${surah}&ayahStart=${ayahStart}&ayahEnd=${ayahEnd}`
      );
      if (response.data.audioUrls && response.data.audioUrls.length > 0) {
        setAudioUrls(response.data.audioUrls);
        setCurrentAudioIndex(0);
        await calculateDurations(response.data.audioUrls);
      }
    } catch (error) {
      console.error("Error fetching audio URLs:", error);
    }
    setLoading(false);
  };

  // Calculate durations of audio files
  const calculateDurations = async (urls) => {
    const durationsArray = await Promise.all(
      urls.map(
        (url) =>
          new Promise((resolve) => {
            const tempAudio = new Audio(url);
            tempAudio.addEventListener("loadedmetadata", () => {
              resolve(tempAudio.duration);
              tempAudio.src = ""; // Clear the source to avoid memory issues
            });
            tempAudio.addEventListener("error", () => {
              resolve(0);
            });
          })
      )
    );
    setDurations(durationsArray);
    const total = durationsArray.reduce((acc, cur) => acc + cur, 0);
    setTotalDuration(total);
  };

  // Fetch ayah text
  const fetchAyahText = async (index) => {
    const ayahNumber = Number(ayahStart) + index;
    try {
      const response = await axios.get(
        `https://api.alquran.cloud/v1/ayah/${surah}:${ayahNumber}`
      );
      if (response.data && response.data.data) {
        setRecitedAyahText(response.data.data.text);
      } else {
        setRecitedAyahText("");
      }
    } catch (error) {
      console.error("Error fetching ayah text:", error);
      setRecitedAyahText("");
    }
  };

  // Fetch page number
  const fetchPageNumber = async (index) => {
    const ayahNumber = Number(ayahStart) + index;
    try {
      const response = await axios.get(
        `https://api.quran.com/api/v4/verses/by_key/${surah}:${ayahNumber}?language=ar`
      );
      const verse = response.data.verse;
      if (verse.page_number !== pageNumber) {
        const imageUrl = getQuranPageImage(verse.page_number, mushafType);
        setBackgroundImageUrl(imageUrl);
        setPageNumber(verse.page_number);
      }
    } catch (error) {
      console.error("Error fetching page number:", error);
    }
  };

  // Update ayah text and page number when currentAudioIndex changes
  useEffect(() => {
    if (audioUrls.length > 0) {
      fetchAyahText(currentAudioIndex);
      fetchPageNumber(currentAudioIndex);
    }
  }, [currentAudioIndex, audioUrls]);

  // Handle play/pause
  const handlePlayPause = () => {
    if (!isPlaying) {
      if (audioRef.current) {
        audioRef.current.play().catch((err) => console.error("Playback error:", err));
      }
      setIsPlaying(true);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle audio ended
  const handleEnded = () => {
    if (currentAudioIndex < audioUrls.length - 1) {
      setCurrentAudioIndex((prevIndex) => prevIndex + 1);
      setCurrentTime(0);
    } else {
      setIsPlaying(false);
    }
  };

  // Update audio source when currentAudioIndex changes
  useEffect(() => {
    if (audioUrls.length > 0 && audioRef.current && audioUrls[currentAudioIndex]) {
      if (!audioRef.current.src.endsWith(audioUrls[currentAudioIndex])) {
        audioRef.current.src = audioUrls[currentAudioIndex];
        audioRef.current.load();
      }
      if (isPlaying) {
        audioRef.current.play().catch((err) => console.error("Auto play error:", err));
      }
    }
  }, [currentAudioIndex, audioUrls, isPlaying]);

  // Calculate overall progress
  const overallCurrentTime =
    durations.slice(0, currentAudioIndex).reduce((acc, cur) => acc + cur, 0) + currentTime;
  const progressPercent =
    totalDuration > 0 ? Math.min((overallCurrentTime / totalDuration) * 100, 100) : 0;

  return (
    <>
      <Head>
        <title>Telawa</title>
      </Head>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Quran Recitation</h1>
        </div>

        <div className={styles.mainContent}>
          <div className={styles.controls}>
            {/* Mushaf Type Dropdown */}
            <div className={styles.selectContainer}>
              <label>Mushaf Type: </label>
              <select value={mushafType} onChange={(e) => setMushafType(e.target.value)}>
                {mushafTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Reciter Dropdown */}
            <div className={styles.selectContainer}>
              <label>Reciter: </label>
              <select value={reciter} onChange={(e) => setReciter(e.target.value)}>
                {Object.keys(recitersMapping).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Surah Dropdown */}
            <div className={styles.selectContainer}>
              <label>Surah: </label>
              <select value={surah} onChange={(e) => setSurah(Number(e.target.value))}>
                {surahs.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Ayah Dropdown */}
            <div className={styles.selectContainer}>
              <label>Start Ayah: </label>
              <select
                value={ayahStart}
                onChange={(e) => setAyahStart(Number(e.target.value))}
                disabled={!ayahs.length}
              >
                {ayahs
                  .filter((ayah) => ayah.number <= ayahEnd) // Ensure ayahStart <= ayahEnd
                  .map((ayah) => (
                    <option key={ayah.number} value={ayah.number}>
                      Ayah {ayah.number}
                    </option>
                  ))}
              </select>
            </div>

            {/* End Ayah Dropdown */}
            <div className={styles.selectContainer}>
              <label>End Ayah: </label>
              <select
                value={ayahEnd}
                onChange={(e) => setAyahEnd(Number(e.target.value))}
                disabled={!ayahs.length}
              >
                {ayahs
                  .filter((ayah) => ayah.number >= ayahStart) // Ensure ayahEnd >= ayahStart
                  .map((ayah) => (
                    <option key={ayah.number} value={ayah.number}>
                      Ayah {ayah.number}
                    </option>
                  ))}
              </select>
            </div>

            <button onClick={fetchAudio} className={styles.fetchButton} disabled={loading}>
              {loading ? "Loading..." : "Fetch Audio"}
            </button>

            {/* Audio Player */}
            <div className={styles.audioPlayerContainer}>
              <button onClick={handlePlayPause} className={styles.playButton}>
                {isPlaying ? (
                  <div className={styles.stopIcon}></div>
                ) : (
                  <div className={styles.playIcon}></div>
                )}
              </button>
              <div className={styles.progressContainer}>
                <div className={styles.progressTime}>
                  {formatTime(overallCurrentTime)} / {formatTime(totalDuration)}
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quran Image */}
          <div className={styles.mushafBox}>
            <img src={backgroundImageUrl} alt="Quran Page" />
          </div>

          {/* Ayah List */}
          <div className={styles.ayahList}>
            {ayahs
              .filter((ayah) => ayah.number >= ayahStart && ayah.number <= ayahEnd)
              .map((ayah) => (
                <div key={ayah.number} className={styles.ayahItem}>
                  {ayah.text}
                </div>
              ))}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.bottomLeft}>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Flag_of_Palestine.svg/1280px-Flag_of_Palestine.svg.png"
              alt="علم فلسطين"
              className={styles.flagImage}
            />
          </div>
          <div className={styles.bottomCenter}>
            <p>لاتنسونا من صالح دعائكم</p>
          </div>
          <div className={styles.bottomRight}>
            <p>كل الدعم لأهل فلسطين</p>
          </div>
        </div>

        {/* Hidden audio element for playback */}
        {audioUrls[currentAudioIndex] && (
          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            style={{ display: "none" }}
          />
        )}
      </div>
    </>
  );
}