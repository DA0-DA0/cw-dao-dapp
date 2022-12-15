// GNU AFFERO GENERAL PUBLIC LICENSE Version 3. Copyright (C) 2022 DAO DAO Contributors.
// See the "LICENSE" file in the root directory of this package for more copyright information.

import { NextApiRequest, NextApiResponse } from 'next'
import { Blob, NFTStorage } from 'nft.storage'

import { parseFormWithImage } from '@dao-dao/stateful/server'
import { NFT_STORAGE_API_KEY } from '@dao-dao/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Parse form fields and image.
    const {
      fields: { name, description = '' },
      imageData,
      mimetype,
    } = await parseFormWithImage(req)

    // Make sure name is not empty.
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty.' })
    }

    // Upload to IPFS via NFT.Storage's API: https://nft.storage/docs/. This
    // automatically uploads the image and creates/uploads a metadata.json file
    // conforming to the ERC-1155 NFT standard.
    const client = new NFTStorage({
      token: NFT_STORAGE_API_KEY,
    })
    const metadata = await client.store({
      name,
      description,
      image: new Blob([imageData], { type: mimetype }),
    })

    return res.status(200).json({
      metadataUrl: metadata.url,
      imageUrl: metadata.embed().image.toString(),
    })
  } catch (err) {
    return res
      .status(400)
      .json({ error: err instanceof Error ? err.message : err })
  }
}

// Disable default body parser since Formidable parses for us.
export const config = {
  api: {
    bodyParser: false,
  },
}
