import { ethers } from 'ethers';
import { useState } from 'react';
import Web3Modal from 'web3modal'
import { create as ipfsHttpClient } from 'ipfs-http-client';
import { useRouter } from 'next/router';

import { nftAddress, nftMarketAddress } from '../config'

import NFT from '../artifacts/contracts/NFT.sol/NFT.json';
import KBMarket from '../artifacts/contracts/KBMarket.sol/KBMarket.json'

//In this component we set the ipfs up to host our nft data of file storage

const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')

export default function MintItem() {
    const [fileUrl, setFileUrl] = useState(null)
    const [formInput, updateFormInput] = useState({ price: '', name: '', description: '' })
    const router = useRouter()

    //set up a function to fireoff when we update files in our form - we can add our NFT images in IPFS

    async function onChange(e) {
        const file = e.target.files[0]
        try {
            const added = await client.add(
                file, {
                progress: (prog) => console.log(`received: ${prog}`)
            })
            const url = `https://ipfs.infura.io:5001/api/v0/${added.path}`
            setFileUrl(url)
        } catch (error) {
            console.log('Error uploading file:', error)
        }
    }

    async function createMarket() {
        const { name, description, price } = formInput
        if (!name || !description || !price || !fileUrl) {
            return;
        }

        // Upload to IPFS
        const data = JSON.stringify({
            name, description, image: fileUrl
        })
        try {
            const added = await client.add(data)
            const url = `https://ipfs.infura.io:5001/api/v0/${added.path}`
            //run a function that creates sale and passes in the url
            createSale(url)
        } catch (error) {
            console.log('Error uploading file:', error)
        }
    }

    async function createSale(url) {
        //create the items and list them on the marketplace
        const web3Modal = new Web3Modal()
        const connection = await web3Modal.connect()
        const provider = new ethers.providers.Web3Provider(connection)
        const signer = provider.getSigner()

        // we create the token
        let contract = new ethers.Contract(nftAddress, NFT.abi, singer);
        let transaction = await contract.mintToken(url)
        let tx = await transaction.wait()
        let event = tx.events[0];
        let value = event.args[2]
        let tokenId = value.toNumber()
        const price = ethers.utils.parseUnits(formInput.price, 'ether')

        // list item for sale on the marketplace
        contract = new ethers.Contract(nftMarketAddress, KBMarket.abi, signer)
        let listingPrice = await contract.getListingPrice();
        listingPrice = listingPrice.toString();

        transaction = await contract.makeMarketItem(nftAddress, tokenId, price, { value: listingPrice });
        await transaction.wait;
        router.push('./')
    }

    return (
        <div className='flex justify-center'>
            <div className='w-1/2 flex flex-col pb-12'>
                <input placeholder='Asset Name'
                    className='mt-8 border rounded p-4'
                    onChange={e => updateFormInput({ ...formInput, name: e.target.value })}>
                </input>
                <textarea placeholder='Asset Description'
                    className='mt-2 border rounded p-4'
                    onChange={e => updateFormInput({ ...formInput, description: e.target.value })}>
                </textarea>
                <input placeholder='Asset Price in Ethereum'
                    className='mt-2 border rounded p-4'
                    onChange={e => updateFormInput({ ...formInput, price: e.target.value })}>
                </input>
                <input type='file'
                    name='Asset'
                    className='mt-4'
                    onChange={onChange}>
                </input>

                {fileUrl && (
                    <img className='rounded mt-4' width='350px' src={fileUrl}></img>
                )}

                <button onClick={createMarket} className='font-bold mt-4 bg-purple-500 text-white rounded p-4 shadow-lg'>
                    Mint NFT
                </button>

            </div>
        </div>)

}