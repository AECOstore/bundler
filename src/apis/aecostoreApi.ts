import * as piral from 'piral-core'
import { PiralPlugin, PiletApi } from 'piral'
import * as React from 'react';
import constants from '../constants'
import Cookies from 'universal-cookie';
import jwt_decode from 'jwt-decode'
import { QueryEngine } from '@comunica/query-sparql'
import { DCAT } from '@inrupt/vocab-common-rdf'
import jsonld from 'jsonld'
import {parse} from '@frogcat/ttl2jsonld'
import fetch from "cross-fetch"
const context = {
  "@context": {
    "link": {"@id": "http://w3id.org/mifesto#code", "@type": "@id"},
    "spec": "http://usefulinc.com/ns/doap#revision",
    "name": "http://www.w3.org/2000/01/rdf-schema#label",
    "route": "http://w3id.org/mifesto#hasRoute",
    "document": {"@id": "https://w3id.org/consolid#inDocument", "@type": "@id"},
    "identifier": {"@id": "https://w3id.org/consolid#hasIdentifier", "@type": "@id"},
    "aggregates": {"@id": "https://w3id.org/consolid#aggregates", "@type": "@id"},
    "value": "https://schema.org/value"
  }
}

const cookies = new Cookies()

declare module 'piral-core/lib/types/custom' {
  interface PiletCustomApi extends AecoStoreApi { }
}

interface AecoStoreApi {
  setDataGlobal(name: string, value: any, options: any): boolean,
  makeState(app: PiletApi, constants: any),
  withState(App: any, options: any),
  getChildModules(app: PiletApi),
  authFetch(input: any, token: string, init?: any),
  makeSession(),
  queryEndpoints(project: IProject[]),
  findSparqlSatellite(webId: string, queryEngine?: QueryEngine),
  findSparqlSatelliteFromResource(projectUrl: string, queryEngine?: QueryEngine),
  findProjectEndpoints(projectUrl: string, queryEngine?: QueryEngine),
  getResourcesByContentType(project, contentType, queryEngine?),
  getResourcesByFilter(project, filter),
  findConceptsById(data, project)
  querySatellite(query:string, satellite: string, type: string),
  getAssociatedConcepts(doc: string, project: any),
  getAllReferences(preQuery: any, identifiers: string[], project: any)
  
} 

export function createAecoStoreApi(): PiralPlugin<AecoStoreApi> {
  return context => () => ({
    setDataGlobal(name, value, options?) {
      return setData(name, value, context, options)
    },
    makeState,
    withState,
    getChildModules,
    authFetch,
    makeSession,
    findSparqlSatellite,
    findSparqlSatelliteFromResource,
    findProjectEndpoints,
    querySatellite,
    getResourcesByContentType,
    getResourcesByFilter,
    findConceptsById,
    getAssociatedConcepts,
    getAllReferences,
    queryEndpoints
  })
}

async function findProjectEndpoints(projectUrl, queryEngine?: QueryEngine) {
  const session = makeSession()
  let root = projectUrl.split('/')
  root.pop()
  const mainUrl = root.join('/')

  if (!queryEngine) {
    queryEngine = new QueryEngine()
  }

  const query = `SELECT * WHERE {
    <${projectUrl}> <${DCAT.dataset}> ?ds .
    FILTER(!CONTAINS(str(?ds), "${mainUrl}"))
  }`

  const bindings = await queryEngine.queryBindings(query, { sources: [projectUrl], fetch: session.fetch })
  const results = await bindings.toArray().then(res => res.map(i => i.get('ds').value))
  results.push(projectUrl)
  return results
}

function withState(App, { app, state, actions }) {
  const { setState } = actions
  const constants = app.getData('CONSTANTS')

  app.on('store-data', ({ name, value }) => {
    for (const [constant, v] of Object.entries(constants)) {
      if (name == v) {
        setState(v, value)
      }
    }
  });

  return App({ piral: app, state })
}

function setData(name, value, context, options?) {
  const { target = 'memory', expires } = Object(piral["createDataOptions"])(options);
  const expiration = Object(piral["getDataExpiration"])(expires);
  return context.tryWriteDataItem(name, value, "global", target, expiration);
}

const makeState = (app: PiletApi) => {
  const constants = app.getData('CONSTANTS')
  const s = {
    state: {},
    actions: {
      setState(dispatch, key, value) {
        dispatch(state => ({
          [key]: value
        }))
      }
    }
  }

  for (const [key, value] of Object.entries(constants)) {
    const url: any = value
    s.state[url] = app.getData(url)
  }
  return app.createState(s)
}

interface IProject {
  projectUrl: string,
  endpoint: string,
  query?: string
}

async function getResourcesByContentType(project: IProject[], contentType) {
  const filter = `?resource <${DCAT.mediaType}> <${contentType}> .`
  return await getResourcesByFilter(project, filter)
}

async function getResourcesByFilter(project: IProject[], filter = "") {
  for (const d of project) {
    d.query = `SELECT * WHERE {
    <${d.projectUrl}> <${DCAT.dataset}> ?ds .
    ?ds <${DCAT.distribution}> ?dist .
    ?dist <${DCAT.downloadURL}> ?resource .
    ${filter}
  }`
  }
  const results = await queryEndpoints(project)
  return results.results.bindings
}

async function queryEndpoints(project: IProject[]) {
  const results = {
    head: {vars: []},
    results: {bindings: []}
  }
  for (const d of project) {
    const info = await querySatellite(d.query, d.endpoint, "from").then(i => i.json())
    info.head.vars.forEach(v => results.head.vars.push(v))
    info.results.bindings.forEach(b => results.results.bindings.push(b))
    
    // const result = await queryEngine.query(d.query, { sources: [d.endpoint] })
    // const { data } = await queryEngine.resultToString(result, resultFormat)
    // const stringified = await streamToString(data)
    // const info = JSON.parse(stringified)
    // results.push(info)
  }
  return results
}

function streamToString (stream): Promise<string> {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  })
}

async function findSparqlSatelliteFromResource(resource: string, queryEngine?: QueryEngine) {
  let split = resource.split('/')
  split.pop()
  const owner = split.join('/') + "/profile/card#me"
  if (!queryEngine) {
    queryEngine = new QueryEngine()
  }
  const satellite = await findSparqlSatellite(owner, queryEngine)
  return satellite
}

async function findSparqlSatellite(webId, queryEngine?: QueryEngine) {
  const query = `SELECT ?sat where {<${webId}> <https://w3id.org/consolid#hasSparqlSatellite> ?sat}`
  if (!queryEngine) {
    queryEngine = new QueryEngine()
  }
  const bindings = await queryEngine.queryBindings(query, { sources: [webId] })
  const results = await bindings.toArray()
  if (results.length) {
    return results[0].get('sat').value
  } else {
    throw Error('No SPARQL satellite was found at this WebId')
  }
}

async function querySatellite(query, satellite, type="FROM") {
  let myHeaders = new Headers();
  const session = makeSession()
  myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
  let urlencoded = new URLSearchParams();
  urlencoded.append("query", query)
  urlencoded.append("type", type)
  const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: urlencoded,
  };

  const results = await session.fetch(`${satellite}`, requestOptions)
  return results
}

function makeSession() {
  let token = cookies.get(constants.ACCESS_TOKEN)
  if (token != "undefined" && token != undefined) {
    const decoded = jwt_decode<any>(token)
    const webId = decoded.webid

    return {
      fetch: authFetch,
      info: {
        webId,
        isLoggedIn: true
      }
    }
  } else {
    return {
      fetch,
      info: {
        isLoggedIn: false
      }
    }
  }

}

async function authFetch(input, init?) {
  let token = cookies.get(constants.ACCESS_TOKEN)
  let options: any = {}
  if (init) {
    options = init
  }
  if (token) {
    if (options.headers) {
      options.headers["Authorization"] = `Bearer ${token}`
    } else {
      options.headers = { "Authorization": `Bearer ${token}` }
    }
  }
  return await fetch(input, options)
}

function getChildModules(piral: PiletApi) {
  const modules = piral.getData("CONFIGURATION").items
  let childrenLinks
  if (piral.meta["hosts"]) {
    if (Array.isArray(piral.meta["hosts"])) {
      childrenLinks = piral.meta["hosts"]
    } else {
      childrenLinks = [piral.meta["hosts"]]
    }
  } else {
    childrenLinks = []
  }

  return modules.filter((item) => {
    return childrenLinks.includes(item["@id"])
  })
}

function encode(str) {
    let s = encodeURIComponent(str)
    s = s.replace("#", "%23").replace("$", "%24")
    return s
}

async function getAssociatedConcepts(doc, project) {
  const session = makeSession()
  const data = {}
  for (const partial of project) {
      const query = `
    SELECT ?concept ?alias ?val 
    FROM NAMED <${partial.referenceRegistry}> 
    WHERE {
      graph ?g {?concept a <https://w3id.org/consolid#Concept> ;
          <https://w3id.org/consolid#aggregates> ?reference .
      ?reference <https://w3id.org/consolid#hasIdentifier> ?id.
      ?id <https://w3id.org/consolid#inDocument> <${doc}> ;
      <https://schema.org/value> ?val . 

      OPTIONAL {
          ?concept <https://w3id.org/consolid#aggregates> ?alias .
          FILTER regex(str(?alias), '^((?!${partial.pod}).)*$')
      }

      FILTER regex(str(?concept), '^((?!graph=).)*$')
      FILTER regex(str(?alias), '^((?!graph=).)*$')

    }}`

      const results = await querySatellite(query, partial.endpoint).then(i => i.json())
      // console.log('JSON.stringify(results, 0,4) :>> ', JSON.stringify(results, 0,4));
      results.results.bindings.forEach(binding => {
          // console.log('"' + binding.val.value + '"');
          if (!data[binding.concept.value]) data[binding.val.value] = [binding.concept.value]
          if (binding.alias) data[binding.val.value].push(binding.alias.value)
      })

  }
  return data
}

async function getAllReferences(preQuery, identifiers, project) {
  let data = []
  for (const partial of project) {
      const endpoint = partial.endpoint
      let conceptCount = []
      let varString = `CONSTRUCT {`
      let queryString = `} FROM NAMED <${partial.referenceRegistry}> WHERE { GRAPH ?g {`
      for (const identifier of identifiers) {
          const aliases = preQuery[identifier].filter(i => i.includes(partial.pod))
          aliases.forEach(alias => {
              conceptCount.push(alias)

              // varString += `?reference_${conceptCount.length - 1} ?value_${conceptCount.length - 1} ?document_${conceptCount.length - 1} ?concept_${conceptCount.length - 1} \n`
              varString += `?concept_${conceptCount.length - 1} <https://w3id.org/consolid#hasIdentifier> ?id_${conceptCount.length - 1}.
              ?id_${conceptCount.length - 1} <https://w3id.org/consolid#inDocument> ?document_${conceptCount.length - 1} ;
          <https://schema.org/value> ?value_${conceptCount.length - 1} . `

              queryString += `BIND(<${alias}> as ?concept_${conceptCount.length - 1}) 
<${alias}> a <https://w3id.org/consolid#Concept> ;
  <https://w3id.org/consolid#aggregates> ?reference_${conceptCount.length - 1} .
?reference_${conceptCount.length - 1} <https://w3id.org/consolid#hasIdentifier> ?id_${conceptCount.length - 1}.
  ?id_${conceptCount.length - 1} <https://w3id.org/consolid#inDocument> ?document_${conceptCount.length - 1} ;
<https://schema.org/value> ?value_${conceptCount.length - 1} . 
\n`
          })
      }

      if (conceptCount.length) {
          const query = varString + queryString + `}}`
          const results = await querySatellite(query, endpoint).then(i => i.text())
          const asJsonLD = parse(results)
          const flattened = await jsonld.flatten(asJsonLD)
          const compacted = await jsonld.compact(flattened, context)
          const graph = compacted["@graph"]
          data = [...data, graph]
      }
  }
  const selection = Object.keys(preQuery).filter(key => identifiers.includes(key)).map(key => preQuery[key])
  return reconstruct(data.flat(), selection)

}

function reconstruct(data, preQuery) {
  const concepts = {}
  for (const dict of data) {
      if (dict.identifier) {
          const concept = dict["@id"]
          if (!concepts[concept]) concepts[concept] = []
          
          data.filter(i => i["@id"] === dict.identifier)
          .forEach(i => concepts[concept].push({identifier: i.value, document: i.document}))
      }
  }

  const final = []
  for (const concept of preQuery) {
      const references = []
      const c: any = {aliases: concept}
      for (const alias of concept) {
          references.push(concepts[alias])
      }
      c.references = references.flat()
      final.push(c)
  }
  return final
}

async function getReferencesAndConcepts(d, project) {
    const podToEndpoint = {}
    project.forEach(i => {
        podToEndpoint[i.pod] = i.endpoint
    })
    const ordered = {}
    for (const endpoint of project.map(i => i.endpoint)) ordered[endpoint] = []
    for (const i in d) {
        const element = d[i]
        const str = `SELECT ?concept_${i} ?aggr_${i} WHERE {
?concept_${i} a <https://w3id.org/consolid#Concept> ;
    <https://w3id.org/consolid#aggregates> ?reference_${i}, ?aggr_${i} .
?reference_${i} <https://w3id.org/consolid#hasIdentifier> ?id_${i} .
?id_${i} <https://w3id.org/consolid#inDocument> <${element.activeDocument}>;
    <https://schema.org/value> "${element.identifier}". }`

        for (const endpoint of project.map(i => i.endpoint)) {
            const data = await fetch(`${endpoint}?query=${encode(str)}`, { method: "POST" }).then(response => response.json())
            if (data.results.bindings.length) {
                const real = data.results.bindings.filter(binding => !binding[`concept_${i}`].value.includes("?graph="))

                for (const binding of real) {
                    const conceptVaultArr = binding[`concept_${i}`].value.split('/')
                    conceptVaultArr.pop()
                    const conceptVault = conceptVaultArr.join("/") + '/'

                    let data
                    if (binding[`aggr_${i}`].value.includes(conceptVault)) {
                        // this is local
                        // so we need to search for this value as a REFERENCE in the same Reference Registry
                        data = {
                            original: binding[`concept_${i}`].value,
                            type: "REFERENCE",
                            value: binding[`aggr_${i}`].value,
                        }
                        ordered[endpoint].push(data)


                    } else {
                        // this is remote
                        // so we need to search for this value as a CONCEPT in the same Reference Registry
                        data = {
                            original: binding[`concept_${i}`].value,
                            type: "CONCEPT",
                            value: binding[`aggr_${i}`].value
                        }

                        const aggrVaultArr = binding[`aggr_${i}`].value.split('/')
                        aggrVaultArr.pop()
                        const aggrVault = aggrVaultArr.join("/") + '/'
                        const ep = podToEndpoint[aggrVault]
                        ordered[ep].push(data)

                    }

                }
            }
        }
    }

    return ordered
}

async function doQuery(ordered) {
    const concepts = []
    for (const endpoint of Object.keys(ordered)) {
        const items = ordered[endpoint]
        let q = `SELECT * WHERE {`
        for (const i in items) {
            const item = items[i]
            if (item.type == "CONCEPT") {
                q += `<${item.value}> <https://w3id.org/consolid#aggregates> ?ref_${i} .
                ?ref_${i} <https://w3id.org/consolid#hasIdentifier> ?id_${i} .
                ?id_${i} <https://w3id.org/consolid#inDocument> ?doc_${i} ;
                <https://schema.org/value> ?value_${i} .

                ?meta_${i} <${DCAT.distribution}>/<${DCAT.downloadURL}> ?doc_${i}

                BIND(<${item.original}> as ?concept_${i})
                BIND(<${item.value}> as ?alias_${i})
                `
            } else {
                q += `<${item.original}> <https://w3id.org/consolid#aggregates> ?ref_${i} .
                ?ref_${i} <https://w3id.org/consolid#hasIdentifier> ?id_${i} .
                ?id_${i} <https://w3id.org/consolid#inDocument> ?doc_${i} ;
                <https://schema.org/value> ?value_${i} .

                ?meta_${i} <${DCAT.distribution}>/<${DCAT.downloadURL}> ?doc_${i}

                BIND(<${item.original}> as ?concept_${i})

                `
            }
        }
        q += '}'

        const results = await fetch(`${endpoint}?query=${encode(q)}`, { method: "POST" }).then(i => i.json())
        // console.log('results', JSON.stringify(results, undefined, 4))

        if (results.results.bindings) {
            groupResults(results.results.bindings[0]).forEach(i => {console.log('i', i); concepts.push({...i, endpoint})})
        }
    }
    const data = orderResults(concepts)
    return Object.values(data)
}

function groupResults(result) {
    const rework = []
    for (const variable of Object.keys(result)) {
        const splut = variable.split("_")
        const v = splut[0]
        const index = splut[1]
        if (rework[index]) {
            rework[index][v] = result[variable].value
        } else {
            rework[index] = { [v]: result[variable].value }
        }
    }
    return rework
}

function orderResults(data) {
    const concepts = {}
    for (const item of data) {
        if (concepts[item.concept]) {
            if (item.alias && !concepts[item.concept].aliases.includes(item.alias)) concepts[item.concept].aliases.push(item.alias)
            concepts[item.concept]["references"].push({
                reference: item.ref,
                identifier: item.value,
                document: item.doc,
                meta: item.meta,
                endpoint: item.endpoint
            })

        } else {
            const aliases = [item.concept]
            if (item.alias) aliases.push(item.alias)

            const references = [{
                    reference: item.ref,
                    identifier: item.value,
                    document: item.doc,
                    meta: item.meta,
                    endpoint: item.endpoint
            }]
            concepts[item.concept] = {
                aliases,
                references
            }
        }
    }
    return concepts
}

async function findConceptsById(data, project) {
    const ordered = await getReferencesAndConcepts(data, project)
    const results = await doQuery(ordered)
    return results
}
