#!/usr/bin/env python3
"""
Temporary script to generate realistic survey responses with geographic distribution.
This will be deleted after running.
"""
import requests
import time
import random
import uuid
from datetime import datetime

# Survey configuration
SURVEY_ID = "e6a2dc38-7a8f-4ace-b436-1163258c9f02"
SITE_ID = "site_5627330ec0d41e8233f55ca974bf89fd"
API_BASE = "http://localhost:3000"

# Question and answer IDs from the database
QUESTIONS = {
    "q1": {
        "id": "89fcac11-7cc4-4e8b-b646-a50cbfbc5364",
        "options": [
            "a57a53b4-df26-4056-82c0-ec86cab30cd6",  # More time to think
            "a28740e4-d40d-4765-b5fc-2a58289e9f84",  # Price too high
            "56f4f9f6-caef-48f3-9d57-b2fff9e59ba8",  # Not sure which option
            "6a60b939-c890-49ef-a8a1-eeb885521b24",  # Compare with others
        ]
    },
    "q2": {
        "id": "343314cc-fef1-4b3a-b894-32d97b8d4359",
        "options": [
            "4dcf1f52-e2eb-4151-9e78-7a504dce98d0",  # Clearer explanation
            "feccc941-1fc7-4aec-a30f-e97aacb26879",  # Side-by-side comparison
            "87dd770b-0544-487e-95c3-c2d3e4b2a5f6",  # Customer reviews
            "95e7c5ad-5dbd-434c-b818-26f153d18f42",  # Best choice recommendation
        ]
    }
}

# Real public IP ranges from different countries (using well-known public IPs)
# These are real IPs that will return correct geo data
IP_POOLS = {
    "USA": [
        "8.8.8.8",           # Google DNS (Mountain View, CA)
        "1.1.1.1",           # Cloudflare (Los Angeles, CA)
        "208.67.222.222",    # OpenDNS (San Francisco, CA)
        "4.2.2.2",           # Level3 (Various US locations)
        "199.59.148.10",     # Twitter (San Francisco, CA)
        "151.101.1.140",     # Fastly (Various US locations)
        "23.20.239.12",      # AWS East Coast
        "54.239.28.85",      # AWS West Coast
    ],
    "UK": [
        "8.8.4.4",           # Google (London)
        "212.58.224.131",    # BBC (London)
        "151.101.192.140",   # Fastly UK
        "185.40.4.65",       # UK ISP
    ],
    "Canada": [
        "142.250.72.46",     # Google Canada
        "184.168.131.241",   # Canadian ISP
        "99.250.191.140",    # Canadian network
    ],
    "Australia": [
        "1.1.1.2",           # Cloudflare Sydney
        "203.206.159.4",     # Telstra Australia
        "139.130.4.5",       # Australian network
    ],
    "Israel": [
        "91.231.246.50",     # Israeli ISP
        "212.150.161.4",     # Bezeq Israel
    ],
    "France": [
        "212.27.48.10",      # French network
        "193.252.19.3",      # French ISP
    ],
    "Italy": [
        "151.11.0.1",        # Telecom Italia
        "62.94.0.1",         # Italian ISP
    ],
    "Singapore": [
        "165.21.83.88",      # Singapore network
        "203.116.165.5",     # SingTel
    ],
    "Spain": [
        "88.26.250.10",      # Spanish network
        "62.42.230.24",      # Spanish ISP
    ],
}

# Distribution based on the image (total ~39,732 orders)
# We'll generate 2000 responses to match proportions
COUNTRY_DISTRIBUTION = {
    "USA": 1860,       # ~93%
    "UK": 34,          # ~1.7%
    "Canada": 25,      # ~1.25%
    "Australia": 20,   # ~1%
    "Israel": 20,      # ~0.5%  (bumped up for better testing)
    "France": 17,      # ~0.85%
    "Italy": 14,       # ~0.7%
    "Singapore": 5,    # ~0.25%
    "Spain": 5,        # ~0.25%
}

def generate_session_id():
    """Generate a random session ID"""
    return f"sess_{uuid.uuid4().hex[:16]}"

def generate_anonymous_user_id():
    """Generate a random anonymous user ID"""
    return f"anon_{uuid.uuid4().hex[:16]}"

def select_random_answer(question_options):
    """Select a random answer with weighted distribution"""
    # Weight towards first 2 options (more common answers)
    weights = [0.35, 0.30, 0.20, 0.15]
    return random.choices(question_options, weights=weights)[0]

def submit_survey_response(ip_address, country):
    """Submit a survey response with the given IP address"""
    
    session_id = generate_session_id()
    anonymous_user_id = generate_anonymous_user_id()
    
    # Generate answers for both questions
    answer_q1 = select_random_answer(QUESTIONS["q1"]["options"])
    answer_q2 = select_random_answer(QUESTIONS["q2"]["options"])
    
    # Create events payload
    events = [
        # Impression event
        {
            "event_type": "impression",
            "client_event_id": f"evt_{uuid.uuid4().hex[:16]}",
            "timestamp": int(time.time() * 1000),
            "survey_id": SURVEY_ID,
            "anonymous_user_id": anonymous_user_id,
            "session_id": session_id,
            "page_url": f"https://dev.particleformen.com/test-page-{random.randint(1,100)}",
            "browser": random.choice(["Chrome", "Safari", "Firefox", "Edge"]),
            "os": random.choice(["Windows", "macOS", "iOS", "Android"]),
            "device": random.choice(["desktop", "mobile", "tablet"]),
        },
        # Answer for question 1
        {
            "event_type": "answer",
            "client_event_id": f"evt_{uuid.uuid4().hex[:16]}",
            "timestamp": int(time.time() * 1000) + random.randint(2000, 8000),
            "survey_id": SURVEY_ID,
            "anonymous_user_id": anonymous_user_id,
            "session_id": session_id,
            "page_url": f"https://dev.particleformen.com/test-page-{random.randint(1,100)}",
            "event_data": {
                "answers": [
                    {
                        "question_id": QUESTIONS["q1"]["id"],
                        "answer_option_id": answer_q1,
                    }
                ]
            },
        },
        # Answer for question 2
        {
            "event_type": "answer",
            "client_event_id": f"evt_{uuid.uuid4().hex[:16]}",
            "timestamp": int(time.time() * 1000) + random.randint(10000, 15000),
            "survey_id": SURVEY_ID,
            "anonymous_user_id": anonymous_user_id,
            "session_id": session_id,
            "page_url": f"https://dev.particleformen.com/test-page-{random.randint(1,100)}",
            "event_data": {
                "answers": [
                    {
                        "question_id": QUESTIONS["q2"]["id"],
                        "answer_option_id": answer_q2,
                    }
                ]
            },
        },
    ]
    
    payload = {
        "site_id": SITE_ID,
        "events": events,
    }
    
    # Submit with X-Forwarded-For header to simulate IP
    # Also include Origin/Referer headers for domain validation
    headers = {
        "Content-Type": "application/json",
        "X-Forwarded-For": ip_address,
        "Origin": "https://dev.particleformen.com",
        "Referer": "https://dev.particleformen.com/test-page",
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/api/public/events",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        if response.status_code in [200, 202]:  # 202 = Accepted (queued)
            print(f"[OK] Response submitted from {country:12s} ({ip_address:15s})")
            return True
        else:
            print(f"[FAIL] Failed from {country} ({ip_address}): {response.status_code}")
            return False
    except Exception as e:
        print(f"[ERROR] Error from {country} ({ip_address}): {e}")
        return False

def main():
    print("=" * 70)
    print("Survey Response Generator - Geographic Distribution")
    print("=" * 70)
    print(f"Survey ID: {SURVEY_ID}")
    print(f"Generating responses with geographic distribution matching site traffic")
    print("=" * 70)
    print()
    
    # Build list of countries to process
    countries_to_process = []
    for country, count in COUNTRY_DISTRIBUTION.items():
        countries_to_process.extend([country] * count)
    
    random.shuffle(countries_to_process)  # Randomize order
    
    total = len(countries_to_process)
    successful = 0
    
    print(f"Total responses to generate: {total}")
    print()
    
    for i, country in enumerate(countries_to_process, 1):
        # Select random IP from country pool
        ip = random.choice(IP_POOLS[country])
        
        print(f"[{i}/{total}] ", end="")
        
        if submit_survey_response(ip, country):
            successful += 1
        
        # Minimal delay for paid API (can handle high request volume)
        if i % 100 == 0:
            delay = 1.5
            print(f"    Progress checkpoint: {i}/{total} completed")
            time.sleep(delay)
        else:
            time.sleep(0.05)  # 50ms delay between requests
    
    print()
    print("=" * 70)
    print(f"Complete! {successful}/{total} responses submitted successfully")
    print("=" * 70)
    
    # Show summary by country
    print("\nDistribution summary:")
    for country, count in sorted(COUNTRY_DISTRIBUTION.items(), key=lambda x: x[1], reverse=True):
        if count > 0:
            percentage = (count / total) * 100
            print(f"  {country:12s}: {count:3d} responses ({percentage:5.1f}%)")

if __name__ == "__main__":
    main()
