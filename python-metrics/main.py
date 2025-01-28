from fastapi import FastAPI, Response
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from typing import Dict

app = FastAPI()

# Dictionary to store our counters
counters: Dict[str, Counter] = {}

@app.get("/metric/{name}/{count}")
async def increment_metric(name: str, count: int):
    if name not in counters:
        # Create a new counter if it doesn't exist, with created timestamp disabled
        counters[name] = Counter(name, f'Counter metric for {name}')

    # Increment the counter by the specified amount
    counters[name].inc(count)
    return {"message": f"Incremented {name} by {count}"}

@app.get("/q/metrics")
async def metrics():
    """Endpoint for Prometheus metrics."""
    return Response(
        generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
