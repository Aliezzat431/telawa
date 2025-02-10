import axios from "axios";

const reciters = {
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
};

const API_1 = "https://verses.quran.com";
const API_2 = "https://api.quran.com/api/v4/recitations";

export default async function handler(req, res) {
  try {
    console.log("Received query:", req.query);
    const { reciter, surah, ayahStart, ayahEnd } = req.query;

    if (!reciter || !surah || !ayahStart || !ayahEnd) {
      console.log("Missing required parameters:", { reciter, surah, ayahStart, ayahEnd });
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Lookup the reciter using the backend mapping.
    const reciterData = reciters[decodeURIComponent(reciter)];
    if (!reciterData) {
      console.log("Reciter not found:", reciter);
      return res.status(404).json({ error: "Reciter not found" });
    }
    const { name: reciterId, apiId, useApi1 } = reciterData;
    console.log("Using reciter:", reciterId, "with useApi1:", useApi1);

    const startAyah = parseInt(ayahStart);
    const endAyah = parseInt(ayahEnd);
    console.log("Ayah range:", startAyah, "to", endAyah);

    // Fetch audio URLs for each ayah in parallel.
    const fetchedUrls = await Promise.all(
      Array.from({ length: endAyah - startAyah + 1 }, async (_, i) => {
        const ayah = startAyah + i;
        if (useApi1) {
          // For reciters using API 1, if the reciter folder is "Alafasy" (مشاري العفاسي),
          // we do NOT add the "Mujawwad" segment.
          let url;
          if (reciterId === "Alafasy") {
            url = `${API_1}/${reciterId}/mp3/${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;
          } else {
            url = `${API_1}/${reciterId}/Mujawwad/mp3/${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;
          }
          try {
            await axios.head(url);
            console.log(`API 1 success for Ayah ${ayah}: ${url}`);
            return url;
          } catch (error) {
            console.log(`API 1 failed for Ayah ${ayah}: ${url}`);
            return null;
          }
        } else {
          // Use API 2 for reciters that do not use API 1.
          return await fetchFromAPI2(apiId, surah, ayah);
        }
      })
    );
    const finalAudioUrls = fetchedUrls.filter((url) => url !== null);
    console.log("Final audioUrls:", finalAudioUrls);

    if (finalAudioUrls.length === 0) {
      console.log("No audio found for requested Ayah range.");
      return res.status(404).json({ error: "No audio found for the requested range" });
    }

    return res.status(200).json({ audioUrls: finalAudioUrls });
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}

// Function to fetch audio from API 2
async function fetchFromAPI2(apiId, surah, ayah) {
  try {
    const api2Url = `${API_2}/${apiId}/by_ayah/${surah}:${ayah}`;
    console.log(`Requesting API 2 for Ayah ${ayah}: ${api2Url}`);
    const response = await axios.get(api2Url);
    console.log(`API 2 response for Ayah ${ayah}:`, response.data);
    if (response.data.audio_files && response.data.audio_files.length > 0) {
      const audioFile = response.data.audio_files[0];
      const requestedVerseKey = `${surah}:${ayah}`;
      if (audioFile.verse_key === requestedVerseKey) {
        let audioUrl = audioFile.url; // May be a relative URL.
        if (!/^https?:\/\//.test(audioUrl)) {
          if (audioUrl.includes("mirrors.quranicaudio.com")) {
            audioUrl = `https://${audioUrl}`;
          } else {
            audioUrl = `${API_1}/${audioUrl}`;
          }
        }
        return audioUrl;
      } else {
        console.log(
          `API 2 verse_key mismatch for Ayah ${ayah}: requested ${requestedVerseKey} but got ${audioFile.verse_key}`
        );
        return null;
      }
    } else {
      console.log(`API 2 returned no audio for Ayah ${ayah}`);
      return null;
    }
  } catch (error) {
    console.log(`API 2 failed for Ayah ${ayah}: ${error.message}`);
    return null;
  }
}











// import axios from "axios";

// // Reciter mapping (handled on the backend)
// const reciters = {
//   "عبدالباسط عبدالصمد": { name: "AbdulBaset", apiId: 1, useApi1: true },
//   "محمد صديق المنشاوي": { name: "Minshawi", apiId: 7, useApi1: true },
//   "عبدالرحمن السديس": { name: "Sudais", apiId: 3, useApi1: false },
//   "سعود الشريم": { name: "Shuraym", apiId: 4, useApi1: false },
//   "مشاري العفاسي": { name: "Mishary", apiId: 9, useApi1: true },
//   "محمود خليل الحصري": { name: "Husary", apiId: 6, useApi1: false },
//   "عبدالله السبيعي": { name: "Sibai", apiId: 10, useApi1: false },
// };



// const API_1 = "https://verses.quran.com";
// const API_2 = "https://api.quran.com/api/v4/recitations";

// export default async function handler(req, res) {
//   try {
//     console.log("Received query:", req.query);
//     const { reciter, surah, ayahStart, ayahEnd } = req.query;

//     if (!reciter || !surah || !ayahStart || !ayahEnd) {
//       console.log("Missing required parameters:", { reciter, surah, ayahStart, ayahEnd });
//       return res.status(400).json({ error: "Missing required parameters" });
//     }

//     // Lookup the reciter using the backend mapping.
//     const reciterData = reciters[decodeURIComponent(reciter)];
//     if (!reciterData) {
//       console.log("Reciter not found:", reciter);
//       return res.status(404).json({ error: "Reciter not found" });
//     }
//     const { name: reciterId, apiId, useApi1 } = reciterData;
//     console.log("Using reciter:", reciterId, "with useApi1:", useApi1);

//     const startAyah = parseInt(ayahStart);
//     const endAyah = parseInt(ayahEnd);
//     console.log("Ayah range:", startAyah, "to", endAyah);

//     // Fetch audio URLs for each ayah in parallel.
//     const fetchedUrls = await Promise.all(
//       Array.from({ length: endAyah - startAyah + 1 }, async (_, i) => {
//         const ayah = startAyah + i;
//         if (useApi1) {
//           // Build API 1 URL with the "Mujawwad" folder.
//           const url = `${API_1}/${reciterId}/Mujawwad/mp3/${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;
//           try {
//             await axios.head(url);
//             console.log(`API 1 success for Ayah ${ayah}: ${url}`);
//             return url;
//           } catch (error) {
//             console.log(`API 1 failed for Ayah ${ayah}: ${url}`);
//             return null;
//           }
//         } else {
//           // Use API 2 for the other reciters.
//           return await fetchFromAPI2(apiId, surah, ayah);
//         }
//       })
//     );
//     const finalAudioUrls = fetchedUrls.filter((url) => url !== null);

//     if (finalAudioUrls.length === 0) {
//       console.log("No audio found for requested Ayah range.");
//       return res.status(404).json({ error: "No audio found for the requested range" });
//     }

//     return res.status(200).json({ audioUrls: finalAudioUrls });
//   } catch (error) {
//     console.error("API error:", error);
//     return res.status(500).json({ error: "Internal Server Error", details: error.message });
//   }
// }

// // Function to fetch audio from API 2
// async function fetchFromAPI2(apiId, surah, ayah) {
//   try {
//     const api2Url = `${API_2}/${apiId}/by_ayah/${surah}:${ayah}`;
//     console.log(`Requesting API 2 for Ayah ${ayah}: ${api2Url}`);
//     const response = await axios.get(api2Url);
//     console.log(`API 2 response for Ayah ${ayah}:`, response.data);
//     if (response.data.audio_files && response.data.audio_files.length > 0) {
//       const audioFile = response.data.audio_files[0];
//       const requestedVerseKey = `${surah}:${ayah}`;
//       if (audioFile.verse_key === requestedVerseKey) {
//         let audioUrl = audioFile.url; // This may be a relative URL.
//         // If the URL is relative, prepend API_1 base URL.
//         if (!/^https?:\/\//.test(audioUrl)) {
//           audioUrl = `${API_1}/${audioUrl}`;
//         }
//         return audioUrl;
//       } else {
//         console.log(
//           `API 2 verse_key mismatch for Ayah ${ayah}: requested ${requestedVerseKey} but got ${audioFile.verse_key}`
//         );
//         return null;
//       }
//     } else {
//       console.log(`API 2 returned no audio for Ayah ${ayah}`);
//       return null;
//     }
//   } catch (error) {
//     console.log(`API 2 failed for Ayah ${ayah}: ${error.message}`);
//     return null;
//   }
// }
