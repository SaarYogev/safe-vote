#[macro_use]
extern crate rocket;

use vote_server::rocket_app;

#[launch]
fn rocket() -> _ {
    println!("rocket launched!");
    rocket_app()
}
