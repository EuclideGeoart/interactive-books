"""Commit independent expected numbers; --check rejects missing or stale files."""
import argparse
import json
from pathlib import Path
import cases
import independent

ROOT = Path(__file__).resolve().parents[2]
DEFAULT = ROOT/"fixtures/p03/instance-probabilistic.json"

def document():
    functions = {"neighbors":independent.neighbors,"metrics":independent.metrics,"bayes":independent.bayes}
    result = {"schema":1,"provenance":"Explicit toy states; independent Fraction/Decimal/exhaustive-subset/closed-form-seed oracle","cases":{},"experiments":{}}
    for kind,values in cases.states().items():
        result["cases"][kind] = [{"name":name,"state":state,"expected":functions[kind](state)} for name,state in values]
    smallest=float.fromhex("0x0.0000000000001p-1022")
    largest=float.fromhex("0x1.fffffffffffffp+1023")
    result["summaries"]=[{"values":v,"expected":independent.summary_reference(v)} for v in
                         ([0,0],[0,1e-200],[smallest,smallest],[0,smallest],[smallest,2*smallest],
                          [1e308]*6,[largest]*9)]
    paths = {
        "neighbors":[cases.NEIGHBORS]+[cases.changed(cases.NEIGHBORS,query={"x":x,"y":0}) for x in (-1.5,0,1.5)],
        "metrics":[cases.METRICS]+[cases.changed(cases.METRICS,dimension=d) for d in (1,2,8,32)],
        "bayes":[cases.BAYES]+[cases.changed(cases.BAYES,observed=mask) for mask in ([False,False],[True,False],[True,True])],
    }
    for kind,path in paths.items():
        frames = [{"index":j,"state":state,"expected":functions[kind](state)} for j,state in enumerate(path)]
        after_name = {"neighbors":"query-right","metrics":"dimension-32","bayes":"unsmoothed"}[kind]
        after = next(c for c in result["cases"][kind] if c["name"] == after_name)
        result["experiments"][kind] = {"before":frames[0],"after":after,"trace":frames}
    return result

def serialized():
    return (json.dumps(document(),indent=2,sort_keys=True,ensure_ascii=True,allow_nan=False)+"\n").encode()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true")
    parser.add_argument("--output",type=Path,default=DEFAULT)
    args = parser.parse_args()
    expected = serialized()
    if args.check:
        if not args.output.is_file() or args.output.read_bytes() != expected:
            raise SystemExit("Missing or stale Part III independent fixture: "+str(args.output))
        print("Part III independent golden check passed:",len(expected),"bytes")
    else:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_bytes(expected)
        print("Generated Part III independent fixtures:",len(expected),"bytes")
