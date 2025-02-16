import aiohttp
import logging
from typing import List, Dict, Any
from datetime import datetime
from xml.etree import ElementTree

logger = logging.getLogger(__name__)

class PubMedService:
    """Service for interacting with the PubMed API"""
    
    def __init__(self):
        self.base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
        self.db = "pubmed"
        # Optional: Add your API key here if you have one
        self.api_key = None
    
    async def search(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """
        Search PubMed for articles matching the query
        
        Args:
            query: The search query
            max_results: Maximum number of results to return (default: 10)
            
        Returns:
            List of article data dictionaries
        """
        try:
            # First get the article IDs
            ids = await self._search_for_ids(query, max_results)
            if not ids:
                return []
                
            # Then fetch the details for those IDs
            articles = await self._fetch_article_details(ids)
            return articles
            
        except Exception as e:
            logger.error(f"Error searching PubMed: {str(e)}")
            raise
    
    async def _search_for_ids(self, query: str, max_results: int) -> List[str]:
        """Search for article IDs matching the query"""
        params = {
            "db": self.db,
            "term": query,
            "retmax": str(max_results),
            "retmode": "json",
            "sort": "relevance"
        }
        if self.api_key:
            params["api_key"] = self.api_key
            
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/esearch.fcgi", params=params) as response:
                if response.status != 200:
                    raise Exception(f"PubMed API error: {response.status}")
                    
                data = await response.json()
                return data.get("esearchresult", {}).get("idlist", [])
    
    async def _fetch_article_details(self, ids: List[str]) -> List[Dict[str, Any]]:
        """Fetch detailed information for a list of article IDs"""
        params = {
            "db": self.db,
            "id": ",".join(ids),
            "retmode": "xml"
        }
        if self.api_key:
            params["api_key"] = self.api_key
            
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/efetch.fcgi", params=params) as response:
                if response.status != 200:
                    raise Exception(f"PubMed API error: {response.status}")
                    
                xml_data = await response.text()
                return self._parse_pubmed_xml(xml_data)
    
    def _parse_pubmed_xml(self, xml_data: str) -> List[Dict[str, Any]]:
        """Parse PubMed XML response into article data"""
        root = ElementTree.fromstring(xml_data)
        articles = []
        
        for article in root.findall(".//PubmedArticle"):
            try:
                # Get basic citation info
                citation = article.find(".//MedlineCitation")
                if citation is None:
                    continue
                    
                # Get article info
                article_elem = citation.find("Article")
                if article_elem is None:
                    continue
                    
                # Extract data
                pmid = citation.find("PMID")
                title = article_elem.find("ArticleTitle")
                abstract = article_elem.find(".//Abstract/AbstractText")
                journal = article_elem.find("Journal/Title")
                pub_date = article_elem.find(".//PubDate")
                
                # Build article data
                article_data = {
                    "id": pmid.text if pmid is not None else None,
                    "title": title.text if title is not None else "No title available",
                    "abstract": abstract.text if abstract is not None else "No abstract available",
                    "journal": journal.text if journal is not None else "Unknown journal",
                    "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid.text}/" if pmid is not None else None,
                    "publication_date": self._parse_pub_date(pub_date) if pub_date is not None else None
                }
                
                articles.append(article_data)
                
            except Exception as e:
                logger.error(f"Error parsing article: {str(e)}")
                continue
                
        return articles
    
    def _parse_pub_date(self, pub_date_elem: ElementTree.Element) -> str:
        """Parse publication date from PubMed XML"""
        try:
            year = pub_date_elem.find("Year")
            month = pub_date_elem.find("Month")
            day = pub_date_elem.find("Day")
            
            date_parts = []
            if year is not None:
                date_parts.append(year.text)
            if month is not None:
                date_parts.append(month.text.zfill(2))
            if day is not None:
                date_parts.append(day.text.zfill(2))
                
            return "-".join(date_parts)
            
        except Exception:
            return None

# Create a singleton instance
pubmed_service = PubMedService()

__all__ = ['pubmed_service'] 