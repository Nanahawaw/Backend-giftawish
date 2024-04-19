import asyncHandler from 'express-async-handler'
import Product from '../models/productModel.js';


export const addProduct = asyncHandler(async (req, res) => {
    const vendor = req.vendor._id;
    const { name, description, price, images, category, tags } = req.body;
    try {
        // Check if a product with the same slug already exists
        const existingProduct = await Product.findOne({ slug: slugify(name, { lower: true, strict: true }) });
        if (existingProduct) {
            return res.status(400).json({ error: 'A product with the same name already exists' });
        }
        const product = new Product({ name, description, price, images, category, tags, vendor })

        const createdProduct = await product.save()
        res.status(201).json(createdProduct)
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
})
