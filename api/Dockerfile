FROM python:3.10-slim

RUN apt-get update && apt-get install -y --no-install-recommends default-jre

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 80
CMD ["gunicorn", "index:app", "--bind", "0.0.0.0:80"]
