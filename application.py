import pickle
import sys
import os
import io
import re
import decimal
import time
import json
import os
import ast
import csv
import sys
import traceback
import logging
from json import JSONEncoder

import click
import flask
from sqlalchemy import *
import psycopg2.extras

import config

from flask import Flask, g, request, url_for, redirect, jsonify, render_template

tmpl_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
application = app = Flask(__name__, template_folder=tmpl_dir)

class MyEncoder(flask.json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return float(o) if o is not None else None
        return super(MyEncoder, self).default(o)


app.json_encoder = MyEncoder


db_opts = dict(
  pool_size=10,
  max_overflow=2,
  pool_recycle=300,
  pool_pre_ping=True,
  pool_use_lifo=True
)
engine = create_engine(config.DBURL, **db_opts)


@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    r.headers['Cache-Control'] = 'public, max-age=0'
    return r


@app.before_request
def before_request():
  """
  This function is run at the beginning of every web request 
  (every time you enter an address in the web browser).
  We use it to setup a database connection that can be used throughout the request

  The variable g is globally accessible
  """
  try:
    g.conn = engine.raw_connection()
  except:
    print("uh oh, problem connecting to database")
    import traceback; traceback.print_exc()
    g.conn = None

@app.teardown_request
def teardown_request(exception):
  """
  At the end of the web request, this makes sure to close the database connection.
  If you don't the database could run out of memory!
  """
  try:
    g.conn.close()
  except Exception as e:
    pass




@app.route('/')
def main():
    return render_template('index.html')



@app.route("/query", methods=["get"])
def query():
  q = request.args.get("q")
  print()
  print(q)

  cursor_opts = dict(cursor_factory=psycopg2.extras.RealDictCursor)
  with g.conn.cursor(**cursor_opts) as cur:
    res = cur.execute(q)
    try: 
      dicts = [dict(row) for row in cur.fetchall()]
      keys = []
      if len(dicts):
        keys = dicts[0].keys()
      values = [[row[key] for key in keys] for row in dicts]
    except Exception as e:
      print("error:", str(e))
      keys = []
      values = []

    cur.execute("commit")
  resp = [dict(
    columns=list(keys),
    values=values
  )]
  return jsonify(resp)


    
if __name__ == "__main__":
  DEC2FLOAT = psycopg2.extensions.new_type(
      psycopg2.extensions.DECIMAL.values,
      'DEC2FLOAT',
      lambda value, curs: float(value) if value is not None else None)
  psycopg2.extensions.register_type(DEC2FLOAT)

  app.run(host='localhost', port=8000, debug=True)
