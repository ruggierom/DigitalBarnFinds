import logging
import os

import azure.functions as func
import httpx

app = func.FunctionApp()


def run_job(job_name: str) -> None:
    api_base_url = os.environ["API_BASE_URL"].rstrip("/")
    admin_token = os.environ["API_ADMIN_TOKEN"]
    endpoint = f"{api_base_url}/admin/jobs/{job_name}"

    response = httpx.post(
        endpoint,
        headers={"x-admin-token": admin_token},
        timeout=120.0,
    )
    response.raise_for_status()
    logging.info("Job %s completed: %s", job_name, response.text)


@app.schedule(
    schedule="0 0 10 * * *",
    arg_name="timer",
    run_on_startup=False,
    use_monitor=True,
)
def incremental_upsert(timer: func.TimerRequest) -> None:
    if timer.past_due:
        logging.warning("Incremental upsert timer is running late.")
    run_job("upsert")


@app.schedule(
    schedule="0 0 11 * * 0",
    arg_name="timer",
    run_on_startup=False,
    use_monitor=True,
)
def weekly_scoring(timer: func.TimerRequest) -> None:
    if timer.past_due:
        logging.warning("Weekly scoring timer is running late.")
    run_job("score")

