export const loadHomepage = async (req, res) => {
    try {
        return res.render("home");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
}

export const loadErrorPage = async (req, res) => {
    try{
        return res.render("errorPage");
    }catch(err){
        console.error(err);
        res.status(404).send("Resource not found");
    }
}