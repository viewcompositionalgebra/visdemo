# VCA

This is a demo for the paper **VCA: View Composition Algebra for Adhoc Comparisons**.


### Setup

Instructions for Mac OSX with Homebrew


1. Install postgresql

      ```
      brew install postgresql
      ```

1. Create postgresql database and populate:

      ```
      createdb test
      psql -f vca.ddl test
      ```


1. Update [config.py](./config.py) to your DB URI.  In most cases, the default should work

1. Install python packages

    ```
    pip install -r requirements.txt
    ```


### Running

Then run the server and go to [http://localhost:8000](http://localhost:8000)


    ```
    python application.py
    ```

