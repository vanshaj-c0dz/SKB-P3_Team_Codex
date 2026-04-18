
# Climate-Resilient Crop Intelligence Dashboard (SKB-P3)

## Team Information

* **Team Name:** Team Codex
* **Team ID:** SKB-F19


## Project Description
This platform is a high-performance **Multimodal AI Dashboard** designed to solve the global challenge of food security under climate stress. It enables breeders and agronomists to simulate how specific crop genotypes (DNA) will perform in extreme weather scenarios (Drought, Heat, Flood) by fusing genomic data with real-time environmental and soil analytics.

Key capabilities include:
- **XAI Genomic Inspector**: Pinpointing high-impact SNPs using Integrated Gradients.
- **Dynamic Scenario Engine**: Real-time "stress tests" for specific geographic coordinates using a Leaflet-based map.
- **Smart Parental Matchmaker**: Recommending optimal crosses of parent varieties to produce climate-resilient offspring.
- **Biologically Valid Blueprints**: Exporting optimized genetic sequences in FASTA/JSON formats for laboratory trials.

## Folder Structure

```text
Team_Codex_SKB-F19_SKB-P3/
├── backend/                # FastAPI Microservices & AI Pipeline
│   ├── ai_models/          # PyTorch architectures (Transformers, ResNets, PINNs)
│   ├── api/                # REST & WebSocket endpoints
│   ├── engines/            # Simulation & Explainability engines
│   ├── data_pipeline/      # VCF and NASA/ISRIC data ingestion
│   └── worker/             # Celery background tasks
├── frontend/               # Next.js 15 Web Application
│   ├── app/                # Main dashboard pages (Overview, Omics, Engine)
│   ├── components/         # Premium UI components (Manhattan plots, Radar charts)
│   ├── lib/                # React Context & Data Utilities
│   └── public/             # Static assets
├── docker-compose.yml      # Full-stack orchestration
└── README.md
```

## Technologies Used

### Frontend
- **Next.js & React**: For a high-performance, SEO-friendly dashboard structure.
- **Tailwind CSS**: Using a custom "Digital Conservatory" design system for premium aesthetics.
- **Framer Motion**: For fluid, glassmorphic UI interactions and micro-animations.
- **Recharts & Leaflet**: For technical data visualization and geographic mapping.

### Backend & AI
- **FastAPI**: As the core asynchronous API gateway.
- **PyTorch**: Driving the Multimodal encoders (Genomic, Enviromic, Pedological).
- **Captum**: Providing the Explainable AI (XAI) attribution layer.
- **Celery & Redis**: Handling long-running AI simulation tasks asynchronously.
- **PostgreSQL**: For persistent storage of variety metadata and blueprint history.

## Contributors

* Shlok Dadhich
* Vanshaj Sharma
* Arijeet Tripathi
* Abhinav Pandey
* Sanchit Garg
