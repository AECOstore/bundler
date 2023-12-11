// import crypto from "crypto"
import { v4 } from "uuid"
async function getAllResourcesAsync(endpoints, authFetch) {
    const allResources = new Set()
    const accessPoint = endpoints.filter(i => i.accessPoint)[0]
    const activeProjectId = accessPoint.projectUrl.split("/").pop()
    const cs = accessPoint.consolid
    const datasetEndpoint = cs + `project/${activeProjectId}/datasets`
    const metadata = await authFetch(datasetEndpoint, { method: "POST", headers: { "Content-Type": "application/json" } }).then(i => i.json()).catch(console.log)

    const body = {
        "distributionFilter": [
          {
            "predicate": "http://www.w3.org/ns/dcat#mediaType",
            "object": "https://www.iana.org/assignments/media-types/text/turtle"
          }
        ]
      }

    const ttlDatasets = await authFetch(datasetEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(i => i.json()).catch(console.log)
    ttlDatasets.forEach(item => {
      allResources.add(item.distribution)
    })

    metadata.forEach(item => {
        allResources.add(item.dataset)
    })
    
    return Array.from(allResources)
  }

  async function findCollectionBySelector(registries, source, value, engine) {
    const query = `
    PREFIX consolid: <https://w3id.org/consolid#>
    PREFIX oa: <http://www.w3.org/ns/oa#>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT * WHERE {
        ?rc a consolid:ReferenceCollection ;
         consolid:aggregates+ ?ref, ?otherRef .
        ?ref ${source ? `oa:hasSource <${source}> ;` : ''}
            oa:hasSelector/rdf:value "${value}".
        ?otherRef oa:hasSource ?otherSource ;
            oa:hasSelector/rdf:value ?otherValue .

        OPTIONAL {?rc consolid:aggregates ?alias .
        ?alias a consolid:ReferenceCollection }
    }`

    const results = await engine.queryBindings(query, {sources: registries}).then(i => i.toArray())
    const concepts = {}
    for (const r of results) {
        console.log(r)
        const concept = r.get('rc').value
        if (!Object.keys(concepts).includes(concept)) {
            concepts[concept] = {
                aliases: new Set(),
                references: new Set()
            }
            concepts[concept].aliases.add(concept)
        }
        if (r.get('alias')) {
            concepts[concept].aliases.add(r.get('alias').value)
        }

        if (r.get('otherSource') && r.get('otherValue')) {
            concepts[concept].references.add(r.get('otherSource').value + "_$$_" + r.get('otherValue').value)
        }
    }

    const sorted = {}
    Object.keys(concepts).forEach(c => {
        const aliasesSortedString = Array.from(concepts[c].aliases).sort().join(';')
        const hash = v4()
        // const hash = crypto.createHash('md5').update(aliasesSortedString).digest('hex')
        if (!Object.keys(sorted).includes(hash)) {
            sorted[hash] = {
                aliases: concepts[c].aliases,
                references: concepts[c].references
            }
        } else {
            sorted[hash].aliases.add(...concepts[c].aliases)
            sorted[hash].references.add(...concepts[c].references)
        }
    })

    for (const s of Object.keys(sorted)) {
        sorted[s].aliases = Array.from(sorted[s].aliases)
        sorted[s].references = Array.from(sorted[s].references).map((i:any) => {return {source: i.split('_$$_')[0], value: i.split('_$$_')[1]}})
    }
    return sorted
}

  export {getAllResourcesAsync, findCollectionBySelector}