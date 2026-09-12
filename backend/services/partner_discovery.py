"""
Gujarat-Wide Partner & Recycler Discovery Service for CarbonLens SME
Uses OpenStreetMap Nominatim for city geocoding and Overpass API for live recycler/waste discovery.
Features progressive radius expansion (25 km -> 50 km -> 75 km) and zero-fabrication fallback handling.
"""

import math
import logging
from typing import List, Dict, Any, Tuple, Optional
import httpx

logger = logging.getLogger(__name__)

# Pre-cached coordinates for major Gujarat industrial & urban hubs
GUJARAT_CITY_COORDS: Dict[str, Tuple[float, float]] = {
    "ahmedabad": (23.0225, 72.5714),
    "vatva": (22.9554, 72.6310),
    "naroda": (23.0725, 72.6685),
    "odhav": (23.0180, 72.6600),
    "sanand": (23.0040, 72.3810),
    "changodar": (22.9150, 72.4450),
    "gandhinagar": (23.2156, 72.6369),
    "surat": (21.1702, 72.8311),
    "sachin": (21.0820, 72.8640),
    "hazira": (21.1160, 72.6510),
    "vadodara": (22.3072, 73.1812),
    "baroda": (22.3072, 73.1812),
    "makarpura": (22.2530, 73.1950),
    "rajkot": (22.3039, 70.8022),
    "metoda": (22.2470, 70.6720),
    "ankleshwar": (21.6264, 73.0152),
    "bharuch": (21.7051, 72.9959),
    "vapi": (20.3712, 72.9042),
    "valsad": (20.5992, 72.9342),
    "halol": (22.5020, 73.4750),
    "panchmahal": (22.7710, 73.6150),
    "morbi": (22.8173, 70.8368),
    "mehsana": (23.5880, 72.3693),
    "bhavnagar": (21.7645, 72.1519),
    "jamnagar": (22.4707, 70.0577),
    "porbandar": (21.6417, 69.6293),
    "junagadh": (21.5222, 70.4579),
    "kutch": (23.2420, 69.6669),
    "bhuj": (23.2420, 69.6669),
    "gandhidham": (23.0753, 70.1337),
    "nadiad": (22.6916, 72.8634),
    "anand": (22.5645, 72.9289)
}

CURATED_PROTOTYPE_PARTNERS: List[Dict[str, Any]] = [
    {
        "id": "partner_ecoplast_vatva",
        "name": "Ecoplast Solutions Pvt Ltd",
        "partner_type": "Mechanical Recycler & Pelletizer",
        "materials_supported": ["HDPE", "PP", "LDPE"],
        "location": "Vatva GIDC, Ahmedabad, Gujarat",
        "lat": 22.9554,
        "lng": 72.6310,
        "contact_info": "Phone: +91 98250 12345 | Email: info@ecoplastsolutions.in",
        "notes": "Specializes in washed HDPE/PP regrind pellets and film scrap processing.",
        "source": "CURATED_PROTOTYPE_DEMO",
        "is_demo": True
    },
    {
        "id": "partner_gujarat_polymers_naroda",
        "name": "Gujarat Polymers Circular Hub",
        "partner_type": "Rigid Plastic Granulator",
        "materials_supported": ["PP", "HDPE", "PET"],
        "location": "Naroda GIDC, Ahmedabad, Gujarat",
        "lat": 23.0725,
        "lng": 72.6685,
        "contact_info": "Phone: +91 98795 67890 | Email: contact@gujaratpolymers.com",
        "notes": "Industrial granulator converting rigid crates and containers into injection-grade re-granulate.",
        "source": "CURATED_PROTOTYPE_DEMO",
        "is_demo": True
    },
    {
        "id": "partner_green_vatva",
        "name": "Green Earth Polymer Recoveries",
        "partner_type": "Industrial Scrap Offtaker",
        "materials_supported": ["LDPE", "LLDPE", "BOPP"],
        "location": "Vatva Phase IV, Ahmedabad, Gujarat",
        "lat": 22.9610,
        "lng": 72.6380,
        "contact_info": "Phone: +91 94260 99887 | Email: ops@greenearthpolymers.in",
        "notes": "CPCB registered recycler providing EPR fulfillment certificates for flexible film packaging waste.",
        "source": "CURATED_PROTOTYPE_DEMO",
        "is_demo": True
    },
    {
        "id": "partner_sanand_ecopellets",
        "name": "Sanand Circular Engineering Plastics",
        "partner_type": "Compounding & Blend Specialist",
        "materials_supported": ["PP", "HDPE", "ABS"],
        "location": "Sanand GIDC, Ahmedabad, Gujarat",
        "lat": 23.0040,
        "lng": 72.3810,
        "contact_info": "Phone: +91 98255 44332 | Email: sales@sanandecopellets.com",
        "notes": "Custom compounding of automotive & appliance post-consumer recycled resins.",
        "source": "CURATED_PROTOTYPE_DEMO",
        "is_demo": True
    },
    {
        "id": "partner_changodar_recovery",
        "name": "Changodar Plastic Recovery Corp",
        "partner_type": "Film Scrap Offtake & EPR Partner",
        "materials_supported": ["LDPE", "LLDPE", "BOPP"],
        "location": "Changodar Industrial Zone, Ahmedabad, Gujarat",
        "lat": 22.9150,
        "lng": 72.4450,
        "contact_info": "Phone: +91 98244 33211 | Email: connect@changodarcircular.com",
        "notes": "Aggregates flexible film scrap under CPCB EPR registration framework.",
        "source": "CURATED_PROTOTYPE_DEMO",
        "is_demo": True
    },
    {
        "id": "partner_shreeji_solar",
        "name": "Shreeji CleanTech Solar & EPC",
        "partner_type": "Rooftop Solar & Energy EPC",
        "materials_supported": ["Solar PV", "Net Metering", "VFD Drives"],
        "location": "Odhav GIDC, Ahmedabad, Gujarat",
        "lat": 23.0180,
        "lng": 72.6600,
        "contact_info": "Phone: +91 98980 11223 | Email: projects@shreejisolar.in",
        "notes": "Turnkey rooftop solar installations and energy audit services for MSMEs.",
        "source": "CURATED_PROTOTYPE_DEMO",
        "is_demo": True
    },
    {
        "id": "partner_vadodara_ecopolymers",
        "name": "Vadodara Circular Polymer Hub",
        "partner_type": "Mechanical Recycler & Toll Compounding",
        "materials_supported": ["HDPE", "PP", "LDPE"],
        "location": "Makarpura GIDC, Vadodara, Gujarat",
        "lat": 22.3072,
        "lng": 73.1812,
        "contact_info": "Phone: +91 98251 77665 | Email: info@vadodarapolymers.in",
        "notes": "Specializes in rigid polymer scrap flaking & compounding for Central Gujarat industrial belt.",
        "source": "CURATED_PROTOTYPE_DEMO",
        "is_demo": True
    },
    {
        "id": "partner_ankleshwar_clean",
        "name": "Ankleshwar Industrial Circular Waste Corp",
        "partner_type": "Hazardous & Polymer Recovery Unit",
        "materials_supported": ["HDPE", "PP", "Industrial Scrap"],
        "location": "Ankleshwar GIDC, Bharuch, Gujarat",
        "lat": 21.6264,
        "lng": 73.0152,
        "contact_info": "Phone: +91 98252 88990 | Email: recycle@ankleshwarcircular.in",
        "notes": "Authorized GPCB partner for industrial polymer scrap & chemical container recycling.",
        "source": "CURATED_PROTOTYPE_DEMO",
        "is_demo": True
    },
    {
        "id": "partner_surat_sachin_polymers",
        "name": "Surat Sachin PCR Granulation Hub",
        "partner_type": "Film & Woven Scrap Recycler",
        "materials_supported": ["LDPE", "LLDPE", "PP"],
        "location": "Sachin GIDC, Surat, Gujarat",
        "lat": 21.1702,
        "lng": 72.8311,
        "contact_info": "Phone: +91 98791 44332 | Email: sales@sachinpcr.com",
        "notes": "Large-scale pelletizer for flexible film scrap & packaging waste across South Gujarat.",
        "source": "CURATED_PROTOTYPE_DEMO",
        "is_demo": True
    },
    {
        "id": "partner_rajkot_metoda_regrind",
        "name": "Rajkot Metoda Engineering Regrind Hub",
        "partner_type": "Rigid Molded Scrap Recycler",
        "materials_supported": ["PP", "HDPE", "ABS"],
        "location": "Metoda GIDC, Rajkot, Gujarat",
        "lat": 22.3039,
        "lng": 70.8022,
        "contact_info": "Phone: +91 94272 11009 | Email: contact@metodaregrind.in",
        "notes": "Toll granulator serving Saurashtra auto-ancillary & rigid molding units.",
        "source": "CURATED_PROTOTYPE_DEMO",
        "is_demo": True
    },
    {
        "id": "partner_vapi_circular_pack",
        "name": "Vapi Paper & Polymer Circular Recovery",
        "partner_type": "Multi-Layer Packaging Recycler",
        "materials_supported": ["PET", "LDPE", "Laminated Packaging"],
        "location": "Vapi GIDC, Valsad, Gujarat",
        "lat": 20.3712,
        "lng": 72.9042,
        "contact_info": "Phone: +91 98240 66554 | Email: info@vapicircular.org",
        "notes": "Specializes in multi-layer flexible barrier scrap & paper-poly foil separation.",
        "source": "CURATED_PROTOTYPE_DEMO",
        "is_demo": True
    },
    {
        "id": "partner_halol_polypellets",
        "name": "Halol Auto-Polymer PCR Compounding",
        "partner_type": "Engineering Polymer Compounder",
        "materials_supported": ["PP", "HDPE", "PET"],
        "location": "Halol GIDC, Panchmahal, Gujarat",
        "lat": 22.5020,
        "lng": 73.4750,
        "contact_info": "Phone: +91 99044 33221 | Email: ops@halolcompounding.in",
        "notes": "Compounding facility converting automotive plastic scrap into reinforced PCR granules.",
        "source": "CURATED_PROTOTYPE_DEMO",
        "is_demo": True
    }
]


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates Haversine distance in kilometers between two lat/lng coordinates."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class PartnerDiscoveryService:
    """Location-aware Partner Discovery Engine using Nominatim & Overpass API."""

    def geocode_city(self, city: str, state: str = "Gujarat", country: str = "India") -> Tuple[float, float]:
        """Geocodes a city using local pre-cached Gujarat coordinates, falling back to Nominatim API."""
        city_clean = city.strip().lower()
        
        # Check pre-cached city list
        for k, coords in GUJARAT_CITY_COORDS.items():
            if k in city_clean or city_clean in k:
                return coords

        # Fall back to Nominatim search API
        try:
            url = f"https://nominatim.openstreetmap.org/search?city={city}&state={state}&country={country}&format=json&limit=1"
            headers = {"User-Agent": "CarbonLens-SME/1.0 (carbonlens@sme.org)"}
            with httpx.Client(timeout=4.0) as client:
                res = client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    if data and len(data) > 0:
                        return (float(data[0]["lat"]), float(data[0]["lon"]))
        except Exception as e:
            logger.warning(f"Nominatim geocoding failed for {city}: {e}")

        # Default fallback to Ahmedabad center
        return (23.0225, 72.5714)

    def query_overpass_api(self, lat: float, lng: float, radius_km: int) -> List[Dict[str, Any]]:
        """Queries Overpass API for real recycling, waste management, and industrial scrap facilities around lat/lng."""
        radius_m = radius_km * 1000
        overpass_query = f"""
        [out:json][timeout:10];
        (
          node["amenity"="recycling"](around:{radius_m},{lat},{lng});
          node["recycling_type"](around:{radius_m},{lat},{lng});
          node["industrial"~"recycling|waste|polymer|plastic"](around:{radius_m},{lat},{lng});
          node["shop"="recycling"](around:{radius_m},{lat},{lng});
          way["amenity"="recycling"](around:{radius_m},{lat},{lng});
          way["landuse"="industrial"]["industrial"~"recycling|waste"](around:{radius_m},{lat},{lng});
        );
        out center 30;
        """
        
        endpoints = [
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter"
        ]

        for endpoint in endpoints:
            try:
                with httpx.Client(timeout=12.0) as client:
                    res = client.post(endpoint, data={"data": overpass_query})
                    if res.status_code == 200:
                        data = res.json()
                        elements = data.get("elements", [])
                        results = []
                        for el in elements:
                            tags = el.get("tags", {})
                            el_lat = el.get("lat") or el.get("center", {}).get("lat")
                            el_lng = el.get("lon") or el.get("center", {}).get("lon")
                            if not el_lat or not el_lng:
                                continue

                            name = tags.get("name") or tags.get("operator") or tags.get("brand") or f"Recycling Facility #{el['id']}"
                            rec_type = tags.get("recycling_type") or tags.get("amenity") or tags.get("industrial") or "Polymer / Waste Recycler"
                            suburb = tags.get("addr:suburb") or tags.get("addr:district") or tags.get("addr:city") or "Industrial Zone"
                            street = tags.get("addr:street") or ""
                            location_str = f"{street}, {suburb}".strip(", ") if street else suburb

                            contact_phone = tags.get("phone") or tags.get("contact:phone") or ""
                            contact_email = tags.get("email") or tags.get("contact:email") or ""
                            website = tags.get("website") or tags.get("contact:website") or ""

                            contact_parts = []
                            if contact_phone: contact_parts.append(f"Phone: {contact_phone}")
                            if contact_email: contact_parts.append(f"Email: {contact_email}")
                            if website: contact_parts.append(f"Web: {website}")
                            contact_info = " | ".join(contact_parts) if contact_parts else "Visit location for contact details"

                            dist = calculate_haversine_distance(lat, lng, el_lat, el_lng)

                            results.append({
                                "id": f"osm_{el['id']}",
                                "name": name,
                                "partner_type": f"OpenStreetMap Live: {rec_type.title()}",
                                "materials_supported": ["Plastic Scrap", "Industrial Waste"],
                                "location": location_str,
                                "lat": el_lat,
                                "lng": el_lng,
                                "computed_distance": round(dist, 1),
                                "contact_info": contact_info,
                                "notes": "Material compatibility should be confirmed with the recycler.",
                                "source": "OPENSTREETMAP_LIVE",
                                "is_demo": False
                            })
                        return results
            except Exception as e:
                logger.warning(f"Overpass endpoint {endpoint} failed: {e}")

        return []

    def discover_partners(
        self,
        city: str = "Ahmedabad",
        state: str = "Gujarat",
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        material: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Discovers partners with progressive radius search:
        25 km -> if < 3 results, 50 km -> if < 3 results, 75 km.
        If live API yields zero results, falls back to curated prototype data clearly labeled.
        """
        if lat is None or lng is None or lat == 0.0 or lng == 0.0:
            lat, lng = self.geocode_city(city, state)

        city_name = city.strip().title() if city else "Gujarat Industrial Belt"

        # 1. Progressive Search Radius
        radii = [25, 50, 75]
        live_partners: List[Dict[str, Any]] = []
        final_radius = 25

        seen_live_ids = set()
        for r in radii:
            final_radius = r
            res = self.query_overpass_api(lat, lng, r)
            for partner in res:
                if partner["id"] not in seen_live_ids:
                    seen_live_ids.add(partner["id"])
                    live_partners.append(partner)
            if len(live_partners) >= 3:
                break

        # Deduplicate & sort by distance
        if live_partners:
            seen = set()
            unique_partners = []
            for p in live_partners:
                if p["id"] not in seen:
                    seen.add(p["id"])
                    unique_partners.append(p)
            unique_partners.sort(key=lambda x: x["computed_distance"])

            search_msg = f"Found {len(unique_partners)} live recycling & waste facilities within {final_radius} km of {city_name}, {state}."
            return {
                "city": city_name,
                "state": state,
                "center_lat": lat,
                "center_lng": lng,
                "radius_km": final_radius,
                "search_status": search_msg,
                "is_fallback": False,
                "data_source": "OPENSTREETMAP_LIVE",
                "partners": unique_partners
            }

        # 2. Zero-Results Fallback to Curated Prototype Data
        # Re-compute distance relative to user lat/lng for curated prototype items
        curated_partners = []
        for p in CURATED_PROTOTYPE_PARTNERS:
            dist = calculate_haversine_distance(lat, lng, p["lat"], p["lng"])
            curated_partners.append({
                **p,
                "computed_distance": round(dist, 1)
            })

        curated_partners.sort(key=lambda x: x["computed_distance"])
        search_msg = f"No live OpenStreetMap recyclers found within 75 km of {city_name}. Displaying CURATED PROTOTYPE DATA across Gujarat."

        return {
            "city": city_name,
            "state": state,
            "center_lat": lat,
            "center_lng": lng,
            "radius_km": 75,
            "search_status": search_msg,
            "is_fallback": True,
            "data_source": "CURATED_PROTOTYPE_DEMO",
            "partners": curated_partners
        }


partner_discovery_service = PartnerDiscoveryService()
