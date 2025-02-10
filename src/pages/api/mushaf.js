// pages/api/mushaf.js
import axios from "axios";

export default async function handler(req, res) {
  const { surah, ayah } = req.query;
  
  if (!surah || !ayah) {
    return res.status(400).json({ error: "Missing required query parameters: surah and ayah" });
  }
  
  try {
    // Fetch verse details from the Quran.com API.
    const response = await axios.get(
      `https://api.quran.com/api/v4/verses/by_key/${surah}:${ayah}?language=ar`
    );
    const verse = response.data.verse;
    if (!verse || !verse.page_number) {
      return res.status(404).json({ error: "Verse or page number not found" });
    }
    
    const pageNumber = verse.page_number;
    // Construct the image URL using the provided external site.
    const imageUrl = `https://www.searchtruth.com/mushaf/quran.php?page=${pageNumber}&page_style=1`;
    
    return res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("Error fetching mushaf page:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}
