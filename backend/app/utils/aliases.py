import re
from typing import List, Optional, Tuple

SKILL_ALIASES = {
    # Languages
    "js": "javascript",
    "javascript": "javascript",
    "ecmascript": "javascript",
    "ts": "typescript",
    "typescript": "typescript",
    "py": "python",
    "python": "python",
    "python3": "python",
    "c++": "c++",
    "cpp": "c++",
    "golang": "go",
    "go lang": "go",
    "go": "go",
    "rs": "rust",
    "rust": "rust",
    "java": "java",
    "c#": "c#",
    "csharp": "c#",
    "ruby": "ruby",
    "php": "php",
    "swift": "swift",
    "kotlin": "kotlin",
    "sql": "sql",
    "r": "r",

    # Frontend
    "react": "react",
    "reactjs": "react",
    "react.js": "react",
    "next": "next.js",
    "nextjs": "next.js",
    "next.js": "next.js",
    "vue": "vue",
    "vuejs": "vue",
    "vue.js": "vue",
    "nuxt": "nuxt.js",
    "nuxtjs": "nuxt.js",
    "angular": "angular",
    "angularjs": "angular",
    "svelte": "svelte",
    "sveltekit": "svelte",
    "tailwind": "tailwind css",
    "tailwindcss": "tailwind css",
    "tailwind-css": "tailwind css",
    "html": "html",
    "html5": "html",
    "css": "css",
    "css3": "css",
    "sass": "sass",
    "scss": "sass",
    "redux": "redux",
    "zustand": "zustand",
    "framer motion": "framer motion",
    "framer-motion": "framer motion",
    "graphql": "graphql",

    # Backend & Frameworks
    "node": "node.js",
    "nodejs": "node.js",
    "node.js": "node.js",
    "express": "express.js",
    "expressjs": "express.js",
    "express.js": "express.js",
    "nest": "nest.js",
    "nestjs": "nest.js",
    "nest.js": "nest.js",
    "fastapi": "fastapi",
    "fast-api": "fastapi",
    "django": "django",
    "flask": "flask",
    "spring": "spring boot",
    "springboot": "spring boot",
    "spring-boot": "spring boot",
    "asp.net": "asp.net",
    "dotnet": ".net",
    ".net": ".net",
    ".net core": ".net",
    "ruby on rails": "ruby on rails",
    "rails": "ruby on rails",

    # Databases
    "postgres": "postgresql",
    "postgresql": "postgresql",
    "psql": "postgresql",
    "mysql": "mysql",
    "sqlite": "sqlite",
    "mongodb": "mongodb",
    "mongo": "mongodb",
    "redis": "redis",
    "cassandra": "cassandra",
    "dynamodb": "dynamodb",
    "elasticsearch": "elasticsearch",
    "neo4j": "neo4j",
    "prisma": "prisma",
    "sqlalchemy": "sqlalchemy",

    # Cloud & DevOps
    "aws": "aws",
    "amazon web services": "aws",
    "gcp": "gcp",
    "google cloud": "gcp",
    "google cloud platform": "gcp",
    "azure": "azure",
    "microsoft azure": "azure",
    "docker": "docker",
    "k8s": "kubernetes",
    "kubernetes": "kubernetes",
    "ci/cd": "ci/cd",
    "cicd": "ci/cd",
    "github actions": "github actions",
    "gitlab ci": "gitlab ci",
    "jenkins": "jenkins",
    "terraform": "terraform",
    "ansible": "ansible",
    "linux": "linux",
    "nginx": "nginx",

    # AI / ML / Data
    "ml": "machine learning",
    "machine learning": "machine learning",
    "deep learning": "deep learning",
    "dl": "deep learning",
    "nlp": "nlp",
    "natural language processing": "nlp",
    "llm": "llm",
    "large language models": "llm",
    "pytorch": "pytorch",
    "tensorflow": "tensorflow",
    "tf": "tensorflow",
    "keras": "keras",
    "scikit-learn": "scikit-learn",
    "sklearn": "scikit-learn",
    "pandas": "pandas",
    "numpy": "numpy",
    "scipy": "scipy",
    "opencv": "opencv",
    "langchain": "langchain",
    "llamaindex": "llamaindex",
    "rag": "rag",
    "huggingface": "hugging face",
    "hugging face": "hugging face",

    # Systems & Tools
    "git": "git",
    "github": "github",
    "jira": "jira",
    "agile": "agile",
    "scrum": "scrum",
    "kafka": "apache kafka",
    "apache kafka": "apache kafka",
    "rabbitmq": "rabbitmq",
    "rest": "rest api",
    "rest api": "rest api",
    "restful": "rest api",
    "grpc": "grpc",
    "microservices": "microservices",
    "unit testing": "testing",
    "jest": "jest",
    "pytest": "pytest",
    "cypress": "cypress",
}

ALL_KNOWN_SKILLS = sorted(list(set(SKILL_ALIASES.values())))

def normalize_skill(skill: str) -> str:
    """Normalize a skill to its canonical lowercase name using the alias map."""
    cleaned = skill.strip().lower()
    cleaned = re.sub(r'[\(\)\[\]]', '', cleaned)
    if cleaned in SKILL_ALIASES:
        return SKILL_ALIASES[cleaned]
    # Check if stripping punctuation matches
    no_punct = re.sub(r'[^a-z0-9#\+]', '', cleaned)
    for alias, canonical in SKILL_ALIASES.items():
        if re.sub(r'[^a-z0-9#\+]', '', alias) == no_punct:
            return canonical
    return cleaned

def normalize_skills_list(skills: List[str]) -> List[str]:
    """Normalize, canonicalize, and deduplicate a list of skills."""
    res = []
    seen = set()
    for s in skills:
        norm = normalize_skill(s)
        if norm and len(norm) > 1 and norm not in seen:
            seen.add(norm)
            res.append(norm)
    return res

def normalize_cgpa(val: Optional[float], original_scale: float = 10.0) -> Tuple[Optional[float], Optional[float], float]:
    """
    Normalizes CGPA to a 10-point scale.
    Returns (normalized_cgpa, raw_cgpa, original_scale).
    """
    if val is None or val <= 0:
        return None, None, 10.0
    
    # If the user has a 4.0 scale (e.g. 3.8/4)
    if original_scale == 4.0 or (val <= 4.0 and original_scale == 4.0):
        normalized = round((val / 4.0) * 10.0, 2)
        return min(normalized, 10.0), val, 4.0
    
    # If val is on a 10-scale
    if val <= 10.0:
        return round(val, 2), val, 10.0
    
    # If val was provided as a percentage (e.g. 85.5%), convert to 10-scale
    if val <= 100.0:
        normalized = round(val / 9.5, 2)  # Standard Indian CBSE/engineering conversion formula
        return min(normalized, 10.0), val, 100.0
        
    return 10.0, val, original_scale
