# Setup

1. Create postgresql database and populate:

    createdb test
    psql -f vca.ddl test


2. Update [config.py](./config.py) to your DB URI

3. Install python packages

    pip install -r requirements.txt


# Running

Then run the server and go to [http://localhost:8000](http://localhost:8000)

    python application.py
