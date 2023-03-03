export const getConfigQuery = `
PREFIX mfe: <http://w3id.org/mifesto#>
PREFIX pav: <http://purl.org/pav/>
PREFIX doap: <http://usefulinc.com/ns/doap#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

CONSTRUCT {
  ?child a ?type ;
    rdfs:label ?name ;
    doap:revision ?revision ;
    mfe:hasRoute ?route ;
    mfe:code ?link ;
    mfe:hosts ?sub ;
    mfe:initialColumns ?col ;
    mfe:initialRows ?row .
} WHERE {
  ?config a mfe:Configuration;
    mfe:hosts+ ?child .

  ?child a ?type ;
    mfe:hasModule ?module .
  
  ?module pav:hasVersion ?version ;
   rdfs:label ?name .

  ?version doap:revision ?revision ;
    mfe:code ?link .

  OPTIONAL {
    ?child mfe:hasRoute ?route .
  }

  OPTIONAL {
    ?child mfe:hasDimensions ?dim .
    ?dim mfe:initialColumns ?col ;
      mfe:initialRows ?row .
  }

  OPTIONAL {
    ?child mfe:hosts ?sub .
  }

}`


export const getConfigQuery2 = `
PREFIX mfe: <http://w3id.org/mfe#>
PREFIX pav: <http://purl.org/pav/>
PREFIX doap: <http://usefulinc.com/ns/doap#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

CONSTRUCT {
  ?version rdfs:label ?name ;
    mfe:code ?link ;
    doap:revision ?revision ;
    mfe:registersRoute ?route ;
    a ?type .
}
WHERE {
  ?config a mfe:Configuration;
    mfe:hosts+ ?child .

  ?child a ?type ;
    mfe:module ?module .
  ?module pav:hasVersion ?version .
  ?version mfe:code ?link ;
    doap:revision ?revision ;
    mfe:registersRoute ?route .
  OPTIONAL {?module rdfs:label ?name}
}`