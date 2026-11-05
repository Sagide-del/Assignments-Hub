import hmac
import multiprocessing as mp
import os
import threading
from typing import Literal
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from solver import dispatch

app=FastAPI(title='Assignment Hub Math Engine',docs_url=None,redoc_url=None,openapi_url=None)
slot=threading.BoundedSemaphore(1)
mp.set_forkserver_preload(['solver'])
class Solve(BaseModel):
    model_config=ConfigDict(extra='forbid')
    question_type:Literal['algebra','matrix','chemical_equation']
    expression:str=Field(min_length=1,max_length=500)
class Compare(BaseModel):
    model_config=ConfigDict(extra='forbid')
    question_type:Literal['algebra','matrix','chemical_equation']
    student_answer:str=Field(max_length=500)
    verified_answer:str=Field(min_length=1,max_length=500)
def auth(token):
    key=os.environ.get('MATH_ENGINE_TOKEN','')
    if not key or not token or not hmac.compare_digest(token,key):raise HTTPException(401,'Unauthorized')
def worker(conn,payload):
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_CPU,(2,2))
        resource.setrlimit(resource.RLIMIT_AS,(384*1024*1024,384*1024*1024))
        conn.send({'ok':True,'data':dispatch(payload)})
    except Exception:
        conn.send({'ok':False})
    finally:conn.close()
def run(payload):
    if not slot.acquire(blocking=False):raise HTTPException(429,'Math engine is busy')
    ctx=mp.get_context('forkserver');parent,child=ctx.Pipe(duplex=False);process=ctx.Process(target=worker,args=(child,payload))
    try:
        process.start();child.close()
        if not parent.poll(3):raise HTTPException(422,'Calculation exceeded its limit')
        try:result=parent.recv()
        except EOFError:raise HTTPException(422,'Unsupported calculation')
        if not result['ok']:raise HTTPException(422,'Unsupported calculation')
        return result['data']
    finally:
        if process.is_alive():process.terminate()
        if process.pid:process.join(timeout=1)
        parent.close();child.close();slot.release()
@app.get('/health')
def health(x_math_engine_token:str|None=Header(default=None)):
    auth(x_math_engine_token);return {'version':1}
@app.post('/solve')
def solve(body:Solve,x_math_engine_token:str|None=Header(default=None)):
    auth(x_math_engine_token);return run({'action':'solve',**body.model_dump()})
@app.post('/equivalent')
def compare(body:Compare,x_math_engine_token:str|None=Header(default=None)):
    auth(x_math_engine_token);return run({'action':'equivalent',**body.model_dump()})
